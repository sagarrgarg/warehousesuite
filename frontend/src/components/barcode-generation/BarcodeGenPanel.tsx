import { useState } from 'react'
import { useFrappePostCall, useFrappeGetCall, useFrappeGetDocList } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { Printer, RefreshCw, Box } from 'lucide-react'
import { API, unwrap, isError, formatPowFetchError } from '@/lib/api'
import QZPrintModal from '../print-labels/QZPrintModal'
import QzStatusDot from '../layout/QzStatusDot'
import ItemSearchInput from '../shared/ItemSearchInput'
import type { DropdownItem } from '@/types'

interface BarcodeGenPanelProps {
	defaultItemCode?: string
}

export default function BarcodeGenPanel({ defaultItemCode }: BarcodeGenPanelProps = {}) {
	const [itemCode, setItemCode] = useState<string | null>(defaultItemCode ?? null)
	const [mode, setMode] = useState<'New Pre-Batch' | 'Existing Batch'>('New Pre-Batch')
	const [batchNo, setBatchNo] = useState('')
	const [existingBatch, setExistingBatch] = useState('')
	const [mfgDate, setMfgDate] = useState('')
	const [expDate, setExpDate] = useState('')
	
	const [generating, setGenerating] = useState(false)
	const [printModalOpen, setPrintModalOpen] = useState(false)
	const [generatedDocname, setGeneratedDocname] = useState('')

	const { call: generateBarcode } = useFrappePostCall(API.createBarcodeGeneration)

	// Fetch items for dropdown/search
	const { data: filterItemsData } = useFrappeGetCall<{ message: DropdownItem[] }>(API.getItemsForDropdown, {})
	const items = filterItemsData?.message ?? []

	// Fetch existing batches for selected item ONLY
	const { data: batches = [] } = useFrappeGetDocList('Batch', {
		fields: ['name', 'expiry_date', 'manufacturing_date'],
		filters: itemCode ? [['item', '=', itemCode], ['disabled', '=', 0]] : undefined,
		limit: 100
	})

	const handleSelectExistingBatch = (bName: string) => {
		setExistingBatch(bName)
		if (!bName) {
			setMfgDate('')
			setExpDate('')
			return
		}
		const csrfToken = (window as any).csrf_token || (window as any).frappe?.csrf_token || ''
		fetch(`/api/method/frappe.client.get_value?doctype=Batch&fieldname=["manufacturing_date","expiry_date","item"]&filters={"name":"${encodeURIComponent(bName)}"}`, {
			headers: { 'X-Frappe-CSRF-Token': csrfToken }
		})
			.then(r => r.json())
			.then(d => {
				const vals = d?.message || d
				if (vals) {
					setMfgDate(vals.manufacturing_date || '')
					setExpDate(vals.expiry_date || '')
					if (vals.item && !itemCode) setItemCode(vals.item)
				}
			})
			.catch(() => {})
	}

	const handleItemSelect = (code: string | null) => {
		setItemCode(code)
		setExistingBatch('')
		setBatchNo('')
		setMfgDate('')
		setExpDate('')
	}

	const handleGenerate = async () => {
		if (!itemCode) { toast.error('Select an Item'); return }
		if (mode === 'New Pre-Batch' && !batchNo) { toast.error('Enter Batch No'); return }
		if (mode === 'Existing Batch' && !existingBatch) { toast.error('Select Existing Batch'); return }

		setGenerating(true)
		try {
			const res = await generateBarcode({
				item_code: itemCode,
				mode,
				batch_no: batchNo,
				existing_batch: existingBatch,
				manufacturing_date: mfgDate || undefined,
				expiry_date: expDate || undefined
			})
			
			const docname = unwrap(res)
			if (isError(docname)) throw new Error(docname.message)
			
			setGeneratedDocname(docname)
			toast.success('Pre-Batch generated successfully')
			setPrintModalOpen(true)
			
			// Reset fields
			setBatchNo('')
			setExistingBatch('')
		} catch (err) {
			toast.error(formatPowFetchError(err, 'Generation failed'))
		} finally {
			setGenerating(false)
		}
	}

	return (
		<div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-4 animate-fade-in space-y-4">
			<div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
				<Box className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
				<h2 className="font-bold text-slate-800 dark:text-white text-sm">Generate Pre-Batches</h2>
				<div className="ml-auto">
					<QzStatusDot />
				</div>
			</div>

			<div className="space-y-3">
				<div>
					<label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 block">Item Code *</label>
					<ItemSearchInput
						items={items}
						value={itemCode ?? ''}
						onSelect={handleItemSelect}
						placeholder="Search item..."
					/>
				</div>

				<div>
					<label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 block">Mode *</label>
					<select 
						value={mode} 
						onChange={e => {
							const newMode = e.target.value as any
							setMode(newMode)
							setExistingBatch('')
							setBatchNo('')
							setMfgDate('')
							setExpDate('')
						}}
						className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none"
					>
						<option value="New Pre-Batch">New Pre-Batch</option>
						<option value="Existing Batch">Existing Batch</option>
					</select>
				</div>

				{mode === 'New Pre-Batch' ? (
					<>
						<div>
							<label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 block">New Batch No *</label>
							<input 
								type="text" 
								value={batchNo} 
								onChange={e => setBatchNo(e.target.value)} 
								placeholder="e.g. BATCH-001"
								className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" 
							/>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 block">Mfg Date</label>
								<input 
									type="date" 
									value={mfgDate} 
									onChange={e => setMfgDate(e.target.value)} 
									className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" 
								/>
							</div>
							<div>
								<label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 block">Expiry Date</label>
								<input 
									type="date" 
									value={expDate} 
									onChange={e => setExpDate(e.target.value)} 
									className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" 
								/>
							</div>
						</div>
					</>
				) : (
					<div className="space-y-3">
						<div>
							<label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 block">Existing Batch *</label>
							<select 
								value={existingBatch} 
								onChange={e => handleSelectExistingBatch(e.target.value)} 
								disabled={!itemCode}
								className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none disabled:opacity-50" 
							>
								<option value="">{!itemCode ? 'Select Item Code first...' : 'Select Batch...'}</option>
								{batches.map((b: any) => (
									<option key={b.name} value={b.name}>{b.name}</option>
								))}
							</select>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 block">Mfg Date (Auto)</label>
								<input 
									type="date" 
									value={mfgDate} 
									readOnly
									className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded px-2.5 py-1.5 text-sm focus:outline-none cursor-not-allowed" 
								/>
							</div>
							<div>
								<label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 block">Expiry Date (Auto)</label>
								<input 
									type="date" 
									value={expDate} 
									readOnly
									className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded px-2.5 py-1.5 text-sm focus:outline-none cursor-not-allowed" 
								/>
							</div>
						</div>
					</div>
				)}

				<button 
					onClick={handleGenerate}
					disabled={generating || !itemCode}
					className="w-full mt-4 flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded text-sm transition-colors disabled:opacity-50 touch-manipulation shadow-xs"
				>
					{generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
					{generating ? 'Generating...' : 'Generate & Print Labels'}
				</button>
			</div>

			<QZPrintModal
				open={printModalOpen}
				onClose={() => setPrintModalOpen(false)}
				doctype="Barcode Generation Tool"
				docname={generatedDocname}
			/>
		</div>
	)
}
