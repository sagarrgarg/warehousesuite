import { useState } from 'react'
import { useSelectedProfile, useProfileOperations, useProfileWarehouses } from '@/hooks/useProfile'
import ProfileSwitcher from '@/components/layout/ProfileSwitcher'
import ActionGrid from '@/components/layout/ActionGrid'
import TransferSendModal from '@/components/transfer/TransferSendModal'
import TransferReceiveModal from '@/components/transfer/TransferReceiveModal'
import StockCountModal from '@/components/stock-count/StockCountModal'
import ItemInquiryModal from '@/components/item-inquiry/ItemInquiryModal'

type ModalType = 'transfer-send' | 'transfer-receive' | 'stock-count' | 'item-inquiry' | null

export default function Dashboard() {
	const {
		selectedProfile,
		selectedProfileName,
		setSelectedProfileName,
		defaultWarehouse,
		setDefaultWarehouse,
		profiles,
		isLoading,
	} = useSelectedProfile()

	const operations = useProfileOperations(selectedProfileName)
	const warehouses = useProfileWarehouses(selectedProfileName)

	const [activeModal, setActiveModal] = useState<ModalType>(null)

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
			</div>
		)
	}

	if (profiles.length === 0) {
		return (
			<div className="flex items-center justify-center h-screen p-6">
				<div className="text-center bg-amber-50 border border-amber-200 rounded-xl p-8 max-w-md">
					<div className="text-4xl mb-3">⚠️</div>
					<h2 className="text-lg font-semibold text-amber-800 mb-2">No POW Profiles assigned to you</h2>
					<p className="text-sm text-amber-600">
						Contact your administrator to assign a POW Profile to your account.
					</p>
				</div>
			</div>
		)
	}

	const handleAction = (action: string) => {
		switch (action) {
			case 'transfer-send':
			case 'transfer-receive':
			case 'stock-count':
			case 'item-inquiry':
				setActiveModal(action)
				break
			case 'purchase-receipt':
				window.location.href = '/app/purchase-receipt'
				break
			case 'delivery-note':
				window.location.href = '/app/delivery-note'
				break
			case 'manufacturing':
				window.location.href = '/app/work-order'
				break
			case 'repack':
				window.location.href = '/app/stock-entry'
				break
		}
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-5">
				<div className="max-w-3xl mx-auto">
					<div className="flex items-center justify-between mb-3">
						<h1 className="text-xl font-bold">POW Dashboard</h1>
						{profiles.length > 1 && (
							<ProfileSwitcher
								profiles={profiles}
								selectedProfileName={selectedProfileName}
								onSelect={setSelectedProfileName}
							/>
						)}
					</div>
					{selectedProfile && (
						<div className="space-y-1">
							<p className="text-sm opacity-90">
								<span className="font-medium">{selectedProfile.name1}</span>
								<span className="mx-2">·</span>
								{selectedProfile.company}
							</p>
							{warehouses && (
								<div className="flex items-center gap-2">
									<label className="text-xs opacity-75">Warehouse:</label>
									<select
										className="bg-white/20 text-white text-sm rounded-lg px-3 py-1.5 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
										value={defaultWarehouse ?? ''}
										onChange={(e) => setDefaultWarehouse(e.target.value || null)}
									>
										<option value="" className="text-gray-900">Select default...</option>
										{warehouses.source_warehouses.map(wh => (
											<option key={wh} value={wh} className="text-gray-900">{wh}</option>
										))}
									</select>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Action Grid */}
			<div className="max-w-3xl mx-auto p-5">
				<ActionGrid operations={operations} onAction={handleAction} />
			</div>

			{/* Modals */}
			{activeModal === 'transfer-send' && warehouses && selectedProfile && (
				<TransferSendModal
					open={true}
					onClose={() => setActiveModal(null)}
					warehouses={warehouses}
					company={selectedProfile.company}
					showOnlyStockItems={!!selectedProfile.show_only_stock_items}
				/>
			)}

			{activeModal === 'transfer-receive' && warehouses && selectedProfile && (
				<TransferReceiveModal
					open={true}
					onClose={() => setActiveModal(null)}
					defaultWarehouse={defaultWarehouse}
					company={selectedProfile.company}
				/>
			)}

			{activeModal === 'stock-count' && warehouses && selectedProfile && (
				<StockCountModal
					open={true}
					onClose={() => setActiveModal(null)}
					warehouses={warehouses}
					company={selectedProfile.company}
					showOnlyStockItems={!!selectedProfile.show_only_stock_items}
				/>
			)}

			{activeModal === 'item-inquiry' && warehouses && (
				<ItemInquiryModal
					open={true}
					onClose={() => setActiveModal(null)}
					allowedWarehouses={warehouses.source_warehouses}
				/>
			)}
		</div>
	)
}
