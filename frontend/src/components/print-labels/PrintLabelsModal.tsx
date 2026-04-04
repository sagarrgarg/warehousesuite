import { useState, useEffect } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { API, unwrap, isError } from '@/lib/api'
import { useZebraPrint } from '@/hooks/useZebraPrint'

interface PrintLabelsModalProps {
	open: boolean
	onClose: () => void
	itemCode: string
	itemData: {
		item_code: string
		item_name?: string
		barcodes?: { barcode: string; barcode_type?: string; uom?: string }[]
		weight_per_unit?: number
		weight_uom?: string
		stock_uom?: string
		uom_conversions?: { uom: string; conversion_factor: number }[]
		uoms?: { uom: string; conversion_factor: number }[]
	}
}

export default function PrintLabelsModal({ open, onClose, itemCode, itemData }: PrintLabelsModalProps) {
	const [printFormat, setPrintFormat] = useState('')
	const [selectedBarcode, setSelectedBarcode] = useState('')
	const [selectedUom, setSelectedUom] = useState('')
	const [selectedCompany, setSelectedCompany] = useState('')
	const [grossWeight, setGrossWeight] = useState('')
	const [labelQty, setLabelQty] = useState('1')
	const [usesUom, setUsesUom] = useState(false)
	const [usesCompany, setUsesCompany] = useState(false)
	const [generating, setGenerating] = useState(false)

	const { printers, loading: printersLoading, refreshPrinters, sendToPrinter } = useZebraPrint()

	const { data: formatsRes } = useFrappeGetCall<{ message: { status: string; formats?: { name: string; raw_printing?: number }[] } }>(
		open ? API.getItemPrintFormats : undefined as any,
		undefined,
		open ? undefined : null,
	)
	const formatsRaw = (formatsRes?.message as any)?.formats ?? (Array.isArray(formatsRes?.message) ? formatsRes?.message : [])
	const formats = Array.isArray(formatsRaw) ? formatsRaw : []

	const { data: companiesRes } = useFrappeGetCall<{ message: { name: string; company_name?: string }[] }>(
		open && usesCompany ? API.getCompanies : undefined as any,
		undefined,
		open && usesCompany ? undefined : null,
	)
	const companiesRaw = companiesRes?.message
	const companies = Array.isArray(companiesRaw) ? companiesRaw : (companiesRaw && Array.isArray((companiesRaw as any).companies) ? (companiesRaw as any).companies : [])

	const { data: settingsRes } = useFrappeGetCall<{ message: { max_label_quantity?: number } }>(
		open ? API.getWmsuiteSettings : undefined as any,
		undefined,
		open ? undefined : null,
	)
	const maxLabelQty = (settingsRes?.message as any)?.max_label_quantity ?? 100

	const { call: generateZpl } = useFrappePostCall(API.generateLabelZpl)

	useEffect(() => {
		if (!open) return
		setPrintFormat('')
		setSelectedBarcode('')
		setSelectedUom('')
		setSelectedCompany('')
		setGrossWeight(itemData?.weight_per_unit ? String(itemData.weight_per_unit) : '')
		setLabelQty('1')
	}, [open, itemData])

	useEffect(() => {
		if (!printFormat) {
			setUsesUom(false)
			setUsesCompany(false)
			return
		}
		const check = async () => {
			try {
				const res = await fetch(`/api/method/${API.analyzePrintFormatVariables}?print_format_name=${encodeURIComponent(printFormat)}`, { credentials: 'include' })
				const json = await res.json()
				const msg = json?.message ?? {}
				setUsesUom(!!msg.uses_selected_uom)
				setUsesCompany(!!msg.uses_company_info)
			} catch {
				setUsesUom(false)
				setUsesCompany(false)
			}
		}
		check()
	}, [printFormat])

	const barcodes = itemData?.barcodes ?? []
	const uoms = itemData?.uom_conversions ?? itemData?.uoms ?? []
	const stockUom = itemData?.stock_uom ?? 'Nos'

	const handleDownload = async () => {
		if (!printFormat?.trim()) { toast.error('Select a print format'); return }
		const gw = parseFloat(grossWeight)
		if (isNaN(gw) || gw <= 0) { toast.error('Enter a valid gross weight'); return }
		const qty = Math.min(Math.max(1, parseInt(labelQty) || 1), maxLabelQty)
		setGenerating(true)
		try {
			const res = await generateZpl({
				item_code: itemCode,
				quantity: qty,
				selected_barcode: selectedBarcode || null,
				selected_uom: selectedUom || null,
				gross_weight: gw,
				company_info: usesCompany ? {} : null,
				print_format: printFormat,
				selected_company: usesCompany ? selectedCompany || null : null,
			})
			const result = unwrap(res)
			if (isError(result)) { toast.error(result.message); return }
			if (result?.zpl_code) {
				const blob = new Blob([result.zpl_code], { type: 'text/plain' })
				const url = URL.createObjectURL(blob)
				const a = document.createElement('a')
				a.href = url
				a.download = `${itemCode}_label.zpl`
				a.click()
				URL.revokeObjectURL(url)
				toast.success('ZPL downloaded')
				onClose()
			}
		} catch (err: any) { toast.error(err?.message || 'Failed') }
		finally { setGenerating(false) }
	}

	const handlePrint = async () => {
		const sel = (document.getElementById('printerSelect') as HTMLSelectElement)?.value
		if (!sel) { toast.error('Select a printer'); return }
		if (!printFormat?.trim()) { toast.error('Select a print format'); return }
		const gw = parseFloat(grossWeight)
		if (isNaN(gw) || gw <= 0) { toast.error('Enter a valid gross weight'); return }
		const qty = Math.min(Math.max(1, parseInt(labelQty) || 1), maxLabelQty)
		setGenerating(true)
		try {
			const res = await generateZpl({
				item_code: itemCode,
				quantity: qty,
				selected_barcode: selectedBarcode || null,
				selected_uom: selectedUom || null,
				gross_weight: gw,
				company_info: usesCompany ? {} : null,
				print_format: printFormat,
				selected_company: usesCompany ? selectedCompany || null : null,
			})
			const result = unwrap(res)
			if (isError(result)) { toast.error(result.message); return }
			if (result?.zpl_code) {
				const printerData = JSON.parse(sel)
				await sendToPrinter(printerData, result.zpl_code)
				toast.success(`Sent ${qty} label(s) to printer`)
				onClose()
			}
		} catch (err: any) { toast.error(err?.message || 'Print failed') }
		finally { setGenerating(false) }
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
						<h2 className="text-sm font-bold">Print Labels</h2>
						<p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{itemData?.item_name || itemCode}</p>
					</div>
				</div>
			</header>

			{/* Body */}
			<div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50">
				<div className="max-w-lg mx-auto px-3 py-3 space-y-3">
					<div className="bg-white border border-slate-200 rounded p-3 space-y-3">
						<div>
							<label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Print Format *</label>
							<select className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" value={printFormat} onChange={e => setPrintFormat(e.target.value)}>
								<option value="">Select...</option>
								{formats.filter((f: any) => f.raw_printing).map((f: any) => (
									<option key={f.name} value={f.name}>{f.name}</option>
								))}
							</select>
						</div>

						{barcodes.length > 0 && (
							<div>
								<label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Barcode</label>
								<select className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" value={selectedBarcode} onChange={e => setSelectedBarcode(e.target.value)}>
									<option value="">None</option>
									{barcodes.map((b: any) => <option key={b.barcode} value={b.barcode}>{b.barcode}</option>)}
								</select>
							</div>
						)}

						{usesUom && (
							<div>
								<label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">UOM *</label>
								<select className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" value={selectedUom} onChange={e => setSelectedUom(e.target.value)}>
									<option value="">Select...</option>
									<option value={stockUom}>{stockUom}</option>
									{uoms.map((u: any) => <option key={u.uom} value={u.uom}>{u.uom}</option>)}
								</select>
							</div>
						)}

						{usesCompany && (
							<div>
								<label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Company *</label>
								<select className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
									<option value="">Select...</option>
									{companies.map((c: any) => <option key={c.name} value={c.name}>{c.company_name || c.name}</option>)}
								</select>
							</div>
						)}

						<div>
							<label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Gross Weight *</label>
							<input type="number" min="0" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" value={grossWeight} onChange={e => setGrossWeight(e.target.value)} placeholder="0" />
						</div>

						<div>
							<label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Label Quantity (max {maxLabelQty})</label>
							<input type="number" min="1" max={maxLabelQty} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" value={labelQty} onChange={e => setLabelQty(e.target.value)} />
						</div>

						<div>
							<label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Printer (for direct print)</label>
							<div className="flex gap-2">
								<select id="printerSelect" className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400">
									<option value="">Select printer...</option>
									{printers.map((p, i) => <option key={i} value={JSON.stringify(p)}>{p.name || `Printer ${i + 1}`}</option>)}
								</select>
								<button onClick={refreshPrinters} disabled={printersLoading} className="px-2.5 py-2 border border-slate-300 rounded text-xs font-bold touch-manipulation text-slate-700">
									{printersLoading ? '...' : 'Refresh'}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="shrink-0 bg-white border-t border-slate-200 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] max-w-lg mx-auto w-full">
				<div className="flex gap-2">
					<button onClick={handleDownload} disabled={generating || !printFormat} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs rounded disabled:opacity-50 touch-manipulation">
						<Download className="w-4 h-4" /> Download ZPL
					</button>
					<button onClick={handlePrint} disabled={generating || !printFormat} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs rounded disabled:opacity-50 touch-manipulation">
						<Printer className="w-4 h-4" /> Print
					</button>
				</div>
			</div>
		</div>
	)
}
