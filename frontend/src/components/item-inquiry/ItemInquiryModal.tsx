import { useState } from 'react'
import { useFrappeGetCall } from 'frappe-react-sdk'
import { X, Search, Package, Ruler, Warehouse, Tags, Users } from 'lucide-react'

interface ItemInquiryModalProps {
	open: boolean
	onClose: () => void
	allowedWarehouses: string[]
}

type Tab = 'barcodes' | 'uom' | 'stock' | 'attributes' | 'suppliers'

export default function ItemInquiryModal({
	open,
	onClose,
	allowedWarehouses,
}: ItemInquiryModalProps) {
	const [searchTerm, setSearchTerm] = useState('')
	const [selectedItem, setSelectedItem] = useState<string | null>(null)
	const [activeTab, setActiveTab] = useState<Tab>('stock')

	const { data: inquiryData, isLoading } = useFrappeGetCall<{ message: any }>(
		selectedItem
			? 'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_item_inquiry_data'
			: null,
		selectedItem
			? { item_code: selectedItem, allowed_warehouses: JSON.stringify(allowedWarehouses) }
			: undefined
	)
	const itemData = inquiryData?.message

	const { data: itemsSearch } = useFrappeGetCall<{ message: any[] }>(
		searchTerm.length >= 2
			? 'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_items_for_dropdown'
			: null,
		searchTerm.length >= 2 ? { warehouse: '', show_only_stock_items: false } : undefined
	)
	const searchResults = (itemsSearch?.message ?? []).filter((item: any) =>
		item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
		item.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
	).slice(0, 10)

	const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
		{ id: 'stock', label: 'Stock', icon: <Warehouse className="w-4 h-4" /> },
		{ id: 'barcodes', label: 'Barcodes', icon: <Package className="w-4 h-4" /> },
		{ id: 'uom', label: 'UOM', icon: <Ruler className="w-4 h-4" /> },
		{ id: 'attributes', label: 'Attributes', icon: <Tags className="w-4 h-4" /> },
		{ id: 'suppliers', label: 'Suppliers', icon: <Users className="w-4 h-4" /> },
	]

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
			<div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b">
					<h2 className="text-lg font-bold">Item Inquiry</h2>
					<button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Search */}
				<div className="p-4 border-b">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<input
							type="text"
							placeholder="Search item code or name..."
							className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
							value={searchTerm}
							onChange={(e) => {
								setSearchTerm(e.target.value)
								if (e.target.value.length < 2) setSelectedItem(null)
							}}
						/>
					</div>

					{/* Search results dropdown */}
					{searchTerm.length >= 2 && !selectedItem && searchResults.length > 0 && (
						<div className="mt-2 border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
							{searchResults.map((item: any) => (
								<button
									key={item.item_code}
									onClick={() => {
										setSelectedItem(item.item_code)
										setSearchTerm(item.item_code)
									}}
									className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b last:border-b-0"
								>
									<p className="text-sm font-medium">{item.item_code}</p>
									<p className="text-xs text-gray-500">{item.item_name}</p>
								</button>
							))}
						</div>
					)}
				</div>

				{/* Item details */}
				<div className="flex-1 overflow-y-auto">
					{isLoading && (
						<div className="flex items-center justify-center py-12">
							<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500" />
						</div>
					)}

					{!selectedItem && !isLoading && (
						<div className="text-center py-12 text-gray-400">
							<Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
							<p>Search for an item to view details</p>
						</div>
					)}

					{itemData && (
						<div>
							{/* Item header */}
							<div className="p-4 bg-gray-50 border-b">
								<h3 className="font-bold text-lg">{itemData.item_code}</h3>
								<p className="text-sm text-gray-600">{itemData.item_name}</p>
								<p className="text-xs text-gray-400 mt-1">
									{itemData.item_group} · {itemData.stock_uom}
								</p>
							</div>

							{/* Tabs */}
							<div className="flex border-b overflow-x-auto">
								{tabs.map(tab => (
									<button
										key={tab.id}
										onClick={() => setActiveTab(tab.id)}
										className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
											activeTab === tab.id
												? 'border-pink-500 text-pink-600'
												: 'border-transparent text-gray-500 hover:text-gray-700'
										}`}
									>
										{tab.icon}
										{tab.label}
									</button>
								))}
							</div>

							{/* Tab content */}
							<div className="p-4">
								{activeTab === 'stock' && (
									<div className="space-y-2">
										{(itemData.stock_info ?? []).length === 0 && (
											<p className="text-sm text-gray-500">No stock information available</p>
										)}
										{(itemData.stock_info ?? []).map((info: any, idx: number) => (
											<div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
												<span className="text-sm">{info.warehouse}</span>
												<span className="text-sm font-semibold">{info.actual_qty} {itemData.stock_uom}</span>
											</div>
										))}
									</div>
								)}

								{activeTab === 'barcodes' && (
									<div className="space-y-2">
										{(itemData.barcodes ?? []).length === 0 && (
											<p className="text-sm text-gray-500">No barcodes configured</p>
										)}
										{(itemData.barcodes ?? []).map((bc: any, idx: number) => (
											<div key={idx} className="p-3 bg-gray-50 rounded-lg">
												<p className="text-sm font-mono font-medium">{bc.barcode}</p>
												<p className="text-xs text-gray-500">{bc.barcode_type}</p>
											</div>
										))}
									</div>
								)}

								{activeTab === 'uom' && (
									<div className="space-y-2">
										{(itemData.uoms ?? []).map((uom: any, idx: number) => (
											<div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
												<span className="text-sm">{uom.uom}</span>
												<span className="text-sm text-gray-500">× {uom.conversion_factor}</span>
											</div>
										))}
									</div>
								)}

								{activeTab === 'attributes' && (
									<div className="space-y-2">
										{(itemData.attributes ?? []).length === 0 && (
											<p className="text-sm text-gray-500">No attributes</p>
										)}
										{(itemData.attributes ?? []).map((attr: any, idx: number) => (
											<div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
												<span className="text-sm text-gray-500">{attr.attribute}</span>
												<span className="text-sm font-medium">{attr.attribute_value}</span>
											</div>
										))}
									</div>
								)}

								{activeTab === 'suppliers' && (
									<div className="space-y-2">
										{(itemData.suppliers ?? []).length === 0 && (
											<p className="text-sm text-gray-500">No suppliers</p>
										)}
										{(itemData.suppliers ?? []).map((sup: any, idx: number) => (
											<div key={idx} className="p-3 bg-gray-50 rounded-lg">
												<p className="text-sm font-medium">{sup.supplier}</p>
												{sup.supplier_part_no && (
													<p className="text-xs text-gray-500">Part No: {sup.supplier_part_no}</p>
												)}
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
