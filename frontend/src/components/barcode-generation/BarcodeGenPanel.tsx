import { useState, useMemo } from 'react'
import { useFrappePostCall, useFrappeGetDocList } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { Printer, RefreshCw, Box } from 'lucide-react'
import { API, unwrap, isError, formatPowFetchError } from '@/lib/api'
import QZPrintModal from '../print-labels/QZPrintModal'
import { useDebounce } from 'use-debounce'

export default function BarcodeGenPanel() {
	const [itemCode, setItemCode] = useState('')
	const [debouncedItemCode] = useDebounce(itemCode, 500)
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
	const { data: items = [] } = useFrappeGetDocList('Item', {
		fields: ['name', 'item_name', 'has_batch_no'],
		filters: debouncedItemCode ? [['name', 'like', `%${debouncedItemCode}%`]] : undefined,
		limit: 10
	})

	const handleGenerate = async () => {
		if (!itemCode) { toast.error('Select an Item'); return }
		if (mode === 'New Pre-Batch' && !batchNo) { toast.error('Enter Batch No'); return }
		if (mode === 'Existing Batch' && !existingBatch) { toast.error('Enter Existing Batch'); return }

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
		<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 animate-fade-in space-y-4">
			<div className="flex items-center gap-2 pb-2 border-b border-slate-100">
				<Box className="w-5 h-5 text-indigo-600" />
				<h2 className="font-bold text-slate-800 text-sm">Generate Pre-Batches</h2>
			</div>

			<div className="space-y-3">
				<div>
					<label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Item Code *</label>
					<input 
						type="text" 
						value={itemCode} 
						onChange={e => setItemCode(e.target.value)} 
						placeholder="Search item..."
						className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" 
					/>
				</div>

				<div>
					<label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Mode *</label>
					<select 
						value={mode} 
						onChange={e => setMode(e.target.value as any)}
						className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none"
					>
						<option value="New Pre-Batch">New Pre-Batch</option>
						<option value="Existing Batch">Existing Batch</option>
					</select>
				</div>

				{mode === 'New Pre-Batch' ? (
					<>
						<div>
							<label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">New Batch No *</label>
							<input 
								type="text" 
								value={batchNo} 
								onChange={e => setBatchNo(e.target.value)} 
								placeholder="e.g. BATCH-001"
								className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" 
							/>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Mfg Date</label>
								<input 
									type="date" 
									value={mfgDate} 
									onChange={e => setMfgDate(e.target.value)} 
									className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" 
								/>
							</div>
							<div>
								<label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Expiry Date</label>
								<input 
									type="date" 
									value={expDate} 
									onChange={e => setExpDate(e.target.value)} 
									className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" 
								/>
							</div>
						</div>
					</>
				) : (
					<div>
						<label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Existing Batch *</label>
						<input 
							type="text" 
							value={existingBatch} 
							onChange={e => setExistingBatch(e.target.value)} 
							placeholder="Select Batch..."
							className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none" 
						/>
					</div>
				)}

				<button 
					onClick={handleGenerate}
					disabled={generating || !itemCode}
					className="w-full mt-4 flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded text-sm transition-colors disabled:opacity-50 touch-manipulation"
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
