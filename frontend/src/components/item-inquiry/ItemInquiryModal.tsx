import { useState } from 'react'
import { useFrappeGetCall } from 'frappe-react-sdk'
import { ArrowLeft, Search, Barcode, Ruler, Warehouse, Tag, Users, Printer } from 'lucide-react'
import { API } from '@/lib/api'
import PrintLabelsModal from '@/components/print-labels/PrintLabelsModal'

interface ItemInquiryModalProps {
	open: boolean
	onClose: () => void
	allowedWarehouses: string[]
}

type Tab = 'stock' | 'barcodes' | 'uom' | 'attributes' | 'suppliers'

export default function ItemInquiryModal({ open, onClose, allowedWarehouses }: ItemInquiryModalProps) {
	const [searchTerm, setSearchTerm] = useState('')
	const [selectedItem, setSelectedItem] = useState<string | null>(null)
	const [activeTab, setActiveTab] = useState<Tab>('stock')
	const [showPrintLabels, setShowPrintLabels] = useState(false)

	const { data: inquiryRaw, isLoading } = useFrappeGetCall<{ message: any }>(
		selectedItem
			? API.getItemInquiryData
			: undefined as any,
		selectedItem
			? { item_code: selectedItem, allowed_warehouses: JSON.stringify(allowedWarehouses) }
			: undefined,
		selectedItem ? undefined : null,
	)

	const apiResponse = inquiryRaw?.message
	const itemData = apiResponse?.data ?? apiResponse

	const { data: itemsSearch } = useFrappeGetCall<{ message: any[] }>(
		searchTerm.length >= 2
			? API.getItemsForDropdown
			: undefined as any,
		searchTerm.length >= 2 ? { show_only_stock_items: false } : undefined,
		searchTerm.length >= 2 ? undefined : null,
	)

	const searchResults = (itemsSearch?.message ?? []).filter((item: any) =>
		item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
		item.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
	).slice(0, 8)

	const barcodes = itemData?.barcodes ?? []
	const uomConversions = itemData?.uom_conversions ?? itemData?.uoms ?? []
	const stockInfo = itemData?.stock_info ?? []
	const attributes = itemData?.attributes ?? []
	const suppliers = itemData?.suppliers ?? []

	const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
		{ id: 'stock', label: 'Stock', icon: <Warehouse className="w-3.5 h-3.5" />, count: stockInfo.length },
		{ id: 'barcodes', label: 'Barcodes', icon: <Barcode className="w-3.5 h-3.5" />, count: barcodes.length },
		{ id: 'uom', label: 'UOM', icon: <Ruler className="w-3.5 h-3.5" />, count: uomConversions.length },
		{ id: 'attributes', label: 'Attrs', icon: <Tag className="w-3.5 h-3.5" />, count: attributes.length },
		{ id: 'suppliers', label: 'Suppliers', icon: <Users className="w-3.5 h-3.5" />, count: suppliers.length },
	]

	const clearSelection = () => {
		setSelectedItem(null)
		setSearchTerm('')
		setActiveTab('stock')
	}

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in">
			{/* Header */}
			<header className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white shrink-0">
				<div className="flex items-center gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
					<button onClick={selectedItem ? clearSelection : onClose} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white dark:bg-slate-800 rounded touch-manipulation">
						<ArrowLeft className="w-5 h-5" />
					</button>
					<h2 className="text-sm font-bold flex-1">Item Inquiry</h2>
				</div>
			</header>

			{/* Search */}
			<div className="px-3 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
				<div className="relative max-w-2xl mx-auto">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
					<input
						type="text"
						placeholder="Type item code or name..."
						className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
						value={searchTerm}
						autoFocus
						onChange={(e) => {
							setSearchTerm(e.target.value)
							if (e.target.value.length < 2) setSelectedItem(null)
						}}
					/>
				</div>

				{searchTerm.length >= 2 && !selectedItem && searchResults.length > 0 && (
					<div className="mt-1.5 max-w-2xl mx-auto bg-white border border-slate-200 rounded overflow-hidden max-h-48 overflow-y-auto">
						{searchResults.map((item: any) => (
							<button
								key={item.item_code}
								onClick={() => { setSelectedItem(item.item_code); setSearchTerm(item.item_code) }}
								className="w-full text-left px-3 py-2 hover:bg-slate-50 active:bg-slate-100 border-b border-slate-100 last:border-b-0 touch-manipulation"
							>
								<p className="text-xs font-semibold text-slate-900">{item.item_code}</p>
								<p className="text-[10px] text-slate-500 truncate">{item.item_name}</p>
							</button>
						))}
					</div>
				)}
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50">
				<div className="max-w-2xl mx-auto">
					{isLoading && (
						<div className="flex items-center justify-center py-16">
							<div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" />
						</div>
					)}

					{!selectedItem && !isLoading && (
						<div className="flex flex-col items-center justify-center py-16 text-center px-6">
							<Search className="w-10 h-10 text-slate-600 dark:text-slate-300 mb-3" />
							<p className="text-sm font-bold text-slate-700 mb-1">Search for an item</p>
							<p className="text-xs text-slate-500">Type at least 2 letters to search</p>
						</div>
					)}

					{itemData && !isLoading && (
						<div>
							{/* Item header */}
							<div className="px-3 py-3 bg-white border-b border-slate-200">
								<div className="flex items-start gap-3">
									{itemData.image ? (
										<img src={itemData.image} alt="" className="w-12 h-12 rounded object-cover bg-slate-100 border border-slate-200" />
									) : (
										<div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center shrink-0">
											<Barcode className="w-5 h-5 text-slate-500 dark:text-slate-400" />
										</div>
									)}
									<div className="min-w-0 flex-1">
										<h3 className="font-bold text-slate-900 text-sm">{itemData.item_code}</h3>
										<p className="text-xs text-slate-500 mt-0.5">{itemData.item_name}</p>
										<div className="flex flex-wrap items-center gap-1 mt-1.5">
											{itemData.item_group && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-px rounded font-medium">{itemData.item_group}</span>}
											{itemData.brand && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-px rounded font-medium">{itemData.brand}</span>}
											<span className={`text-[9px] px-1.5 py-px rounded font-medium ${itemData.is_stock_item ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
												{itemData.is_stock_item ? 'Stock' : 'Non-Stock'}
											</span>
											<span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-px rounded font-bold">{itemData.stock_uom}</span>
										</div>
										<button onClick={() => setShowPrintLabels(true)} className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[10px] font-bold rounded touch-manipulation">
											<Printer className="w-3 h-3" /> Print Labels
										</button>
									</div>
								</div>
							</div>

							{/* Tabs */}
							<div className="flex border-b border-slate-200 overflow-x-auto px-1 bg-white no-scrollbar">
								{tabs.map(tab => (
									<button
										key={tab.id}
										onClick={() => setActiveTab(tab.id)}
										className={`flex items-center gap-1 px-3 py-2 text-[10px] font-semibold whitespace-nowrap border-b-2 transition-colors touch-manipulation ${
											activeTab === tab.id
												? 'border-slate-800 text-slate-900'
												: 'border-transparent text-slate-500 dark:text-slate-400'
										}`}
									>
										{tab.icon}
										{tab.label}
										{(tab.count ?? 0) > 0 && (
											<span className="text-[9px] bg-slate-100 rounded px-1 py-px font-bold">{tab.count}</span>
										)}
									</button>
								))}
							</div>

							{/* Tab content */}
							<div className="px-3 py-3">
								{activeTab === 'stock' && (
									<div className="space-y-1">
										{stockInfo.length === 0 && <p className="text-xs text-slate-500 py-6 text-center">No stock in your warehouses</p>}
										{stockInfo.map((info: any, idx: number) => (
											<div key={idx} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded">
												<span className="text-xs text-slate-700 truncate mr-3">{info.warehouse}</span>
												<span className="text-sm font-bold text-slate-900 tabular-nums whitespace-nowrap">
													{info.actual_qty ?? info.available_qty ?? 0}
													<span className="text-[10px] font-normal text-slate-500 ml-1">{itemData.stock_uom}</span>
												</span>
											</div>
										))}
										{itemData.total_stock > 0 && (
											<div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded mt-1">
												<span className="text-xs font-bold text-blue-700">Total</span>
												<span className="text-sm font-bold text-blue-700 tabular-nums">{itemData.total_stock} {itemData.stock_uom}</span>
											</div>
										)}
									</div>
								)}

								{activeTab === 'barcodes' && (
									<div className="space-y-1">
										{barcodes.length === 0 && <p className="text-xs text-slate-500 py-6 text-center">No barcodes set up</p>}
										{barcodes.map((bc: any, idx: number) => (
											<div key={idx} className="p-2.5 bg-white border border-slate-200 rounded">
												<p className="text-sm font-mono font-bold text-slate-900 tracking-wider">{bc.barcode}</p>
												<p className="text-[10px] text-slate-500 mt-0.5">{bc.barcode_type}{bc.uom ? ` — ${bc.uom}` : ''}</p>
											</div>
										))}
									</div>
								)}

								{activeTab === 'uom' && (
									<div className="space-y-1">
										{uomConversions.length === 0 && <p className="text-xs text-slate-500 py-6 text-center">Only base UOM configured</p>}
										{uomConversions.map((uom: any, idx: number) => (
											<div key={idx} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded">
												<span className="text-xs text-slate-700">{uom.uom}</span>
												<span className="text-xs bg-slate-100 border border-slate-200 px-2 py-1 rounded font-mono font-bold text-slate-800">
													1 {uom.uom} = {uom.conversion_factor} {itemData.stock_uom}
												</span>
											</div>
										))}
									</div>
								)}

								{activeTab === 'attributes' && (
									<div className="space-y-1">
										{attributes.length === 0 && <p className="text-xs text-slate-500 py-6 text-center">No attributes</p>}
										{attributes.map((attr: any, idx: number) => (
											<div key={idx} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded">
												<span className="text-xs text-slate-500">{attr.attribute}</span>
												<span className="text-xs font-semibold text-slate-800">{attr.attribute_value}</span>
											</div>
										))}
									</div>
								)}

								{activeTab === 'suppliers' && (
									<div className="space-y-1">
										{suppliers.length === 0 && <p className="text-xs text-slate-500 py-6 text-center">No suppliers</p>}
										{suppliers.map((sup: any, idx: number) => (
											<div key={idx} className="p-2.5 bg-white border border-slate-200 rounded">
												<p className="text-xs font-semibold text-slate-800">{sup.supplier}</p>
												{sup.supplier_part_no && <p className="text-[10px] text-slate-500 mt-0.5">Part: {sup.supplier_part_no}</p>}
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			{showPrintLabels && itemData && (
				<PrintLabelsModal open onClose={() => setShowPrintLabels(false)} itemCode={itemData.item_code} itemData={itemData} />
			)}
		</div>
	)
}
