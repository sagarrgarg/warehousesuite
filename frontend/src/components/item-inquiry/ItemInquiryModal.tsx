import { useState } from 'react'
import { useFrappeGetCall } from 'frappe-react-sdk'
import { X, Search, Barcode, Ruler, Warehouse, Tag, Users } from 'lucide-react'

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

	const { data: inquiryData, isLoading } = useFrappeGetCall<{ message: any }>(
		selectedItem ? 'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_item_inquiry_data' : null,
		selectedItem ? { item_code: selectedItem, allowed_warehouses: JSON.stringify(allowedWarehouses) } : undefined
	)
	const itemData = inquiryData?.message

	const { data: itemsSearch } = useFrappeGetCall<{ message: any[] }>(
		searchTerm.length >= 2 ? 'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_items_for_dropdown' : null,
		searchTerm.length >= 2 ? { warehouse: '', show_only_stock_items: false } : undefined
	)
	const searchResults = (itemsSearch?.message ?? []).filter((item: any) =>
		item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
		item.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
	).slice(0, 8)

	const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
		{ id: 'stock', label: 'Stock', icon: <Warehouse className="w-4 h-4" /> },
		{ id: 'barcodes', label: 'Barcodes', icon: <Barcode className="w-4 h-4" /> },
		{ id: 'uom', label: 'UOM', icon: <Ruler className="w-4 h-4" /> },
		{ id: 'attributes', label: 'Attrs', icon: <Tag className="w-4 h-4" /> },
		{ id: 'suppliers', label: 'Suppliers', icon: <Users className="w-4 h-4" /> },
	]

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
			<div className="absolute inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white sm:rounded-2xl sm:max-w-lg sm:w-[calc(100%-2rem)] sm:max-h-[85vh] flex flex-col animate-slide-up sm:animate-scale-in" onClick={e => e.stopPropagation()}>
				{/* Header */}
				<div className="flex items-center gap-3 px-4 sm:px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b border-border shrink-0">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white">
						<Search className="w-5 h-5" strokeWidth={2.5} />
					</div>
					<div className="flex-1">
						<h2 className="text-lg font-bold text-foreground">Item Inquiry</h2>
						<p className="text-xs text-muted-foreground">Look up any item</p>
					</div>
					<button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-secondary rounded-xl transition-colors touch-manipulation">
						<X className="w-5 h-5 text-muted-foreground" />
					</button>
				</div>

				{/* Search */}
				<div className="px-4 sm:px-5 py-3 border-b border-border shrink-0">
					<div className="relative">
						<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
						<input
							type="text"
							placeholder="Search by code, name, or barcode..."
							className="w-full pl-10 pr-4 py-3 bg-secondary border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
							value={searchTerm}
							autoFocus
							onChange={(e) => { setSearchTerm(e.target.value); if (e.target.value.length < 2) setSelectedItem(null) }}
						/>
					</div>
					{searchTerm.length >= 2 && !selectedItem && searchResults.length > 0 && (
						<div className="mt-2 bg-card border border-border rounded-xl overflow-hidden max-h-52 overflow-y-auto shadow-lg">
							{searchResults.map((item: any) => (
								<button key={item.item_code} onClick={() => { setSelectedItem(item.item_code); setSearchTerm(item.item_code) }} className="w-full text-left px-4 py-3 hover:bg-secondary active:bg-secondary/80 border-b border-border last:border-b-0 transition-colors touch-manipulation">
									<p className="text-sm font-semibold text-foreground">{item.item_code}</p>
									<p className="text-xs text-muted-foreground truncate">{item.item_name}</p>
								</button>
							))}
						</div>
					)}
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto overscroll-contain">
					{isLoading && (
						<div className="flex items-center justify-center py-16">
							<div className="animate-spin rounded-full h-8 w-8 border-[3px] border-primary/20 border-t-primary" />
						</div>
					)}

					{!selectedItem && !isLoading && (
						<div className="flex flex-col items-center justify-center py-16 text-center px-6">
							<div className="w-20 h-20 bg-secondary rounded-3xl flex items-center justify-center mb-4">
								<Search className="w-10 h-10 text-muted-foreground/50" />
							</div>
							<p className="font-semibold text-foreground mb-1">Search for an item</p>
							<p className="text-sm text-muted-foreground">Type at least 2 characters to search</p>
						</div>
					)}

					{itemData && (
						<div>
							{/* Item summary */}
							<div className="px-4 sm:px-5 py-4 bg-secondary/50 border-b border-border">
								<div className="flex items-start gap-3">
									{itemData.image ? (
										<img src={itemData.image} alt="" className="w-14 h-14 rounded-xl object-cover bg-white border border-border" />
									) : (
										<div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center shrink-0">
											<Barcode className="w-6 h-6 text-pink-500" />
										</div>
									)}
									<div className="min-w-0">
										<h3 className="font-bold text-foreground text-base">{itemData.item_code}</h3>
										<p className="text-sm text-muted-foreground truncate">{itemData.item_name}</p>
										<div className="flex items-center gap-2 mt-1.5">
											<span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-md font-medium">{itemData.item_group}</span>
											<span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-md font-medium">{itemData.stock_uom}</span>
										</div>
									</div>
								</div>
							</div>

							{/* Tabs */}
							<div className="flex border-b border-border overflow-x-auto px-1 no-scrollbar">
								{tabs.map(tab => (
									<button
										key={tab.id}
										onClick={() => setActiveTab(tab.id)}
										className={`flex items-center gap-1.5 px-3.5 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-colors touch-manipulation ${
											activeTab === tab.id
												? 'border-primary text-primary'
												: 'border-transparent text-muted-foreground'
										}`}
									>
										{tab.icon}
										{tab.label}
									</button>
								))}
							</div>

							{/* Tab content */}
							<div className="px-4 sm:px-5 py-4">
								{activeTab === 'stock' && (
									<div className="space-y-2">
										{(itemData.stock_info ?? []).length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No stock data available</p>}
										{(itemData.stock_info ?? []).map((info: any, idx: number) => (
											<div key={idx} className="flex items-center justify-between p-3.5 bg-secondary rounded-xl">
												<span className="text-sm text-foreground truncate mr-3">{info.warehouse}</span>
												<span className="text-sm font-bold text-foreground whitespace-nowrap">{info.actual_qty} <span className="text-xs font-normal text-muted-foreground">{itemData.stock_uom}</span></span>
											</div>
										))}
									</div>
								)}
								{activeTab === 'barcodes' && (
									<div className="space-y-2">
										{(itemData.barcodes ?? []).length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No barcodes</p>}
										{(itemData.barcodes ?? []).map((bc: any, idx: number) => (
											<div key={idx} className="p-3.5 bg-secondary rounded-xl">
												<p className="text-sm font-mono font-bold text-foreground">{bc.barcode}</p>
												<p className="text-xs text-muted-foreground mt-0.5">{bc.barcode_type}</p>
											</div>
										))}
									</div>
								)}
								{activeTab === 'uom' && (
									<div className="space-y-2">
										{(itemData.uoms ?? []).map((uom: any, idx: number) => (
											<div key={idx} className="flex items-center justify-between p-3.5 bg-secondary rounded-xl">
												<span className="text-sm font-medium text-foreground">{uom.uom}</span>
												<span className="text-xs bg-white border border-border px-2.5 py-1 rounded-lg font-mono font-bold text-foreground">x{uom.conversion_factor}</span>
											</div>
										))}
									</div>
								)}
								{activeTab === 'attributes' && (
									<div className="space-y-2">
										{(itemData.attributes ?? []).length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No attributes</p>}
										{(itemData.attributes ?? []).map((attr: any, idx: number) => (
											<div key={idx} className="flex items-center justify-between p-3.5 bg-secondary rounded-xl">
												<span className="text-sm text-muted-foreground">{attr.attribute}</span>
												<span className="text-sm font-semibold text-foreground">{attr.attribute_value}</span>
											</div>
										))}
									</div>
								)}
								{activeTab === 'suppliers' && (
									<div className="space-y-2">
										{(itemData.suppliers ?? []).length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No suppliers</p>}
										{(itemData.suppliers ?? []).map((sup: any, idx: number) => (
											<div key={idx} className="p-3.5 bg-secondary rounded-xl">
												<p className="text-sm font-semibold text-foreground">{sup.supplier}</p>
												{sup.supplier_part_no && <p className="text-xs text-muted-foreground mt-0.5">Part: {sup.supplier_part_no}</p>}
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
