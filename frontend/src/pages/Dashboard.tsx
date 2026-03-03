import { useState } from 'react'
import { useSelectedProfile, useProfileOperations, useProfileWarehouses } from '@/hooks/useProfile'
import ProfileSwitcher from '@/components/layout/ProfileSwitcher'
import ActionGrid from '@/components/layout/ActionGrid'
import TransferSendModal from '@/components/transfer/TransferSendModal'
import TransferReceiveModal from '@/components/transfer/TransferReceiveModal'
import StockCountModal from '@/components/stock-count/StockCountModal'
import ItemInquiryModal from '@/components/item-inquiry/ItemInquiryModal'
import { Warehouse, ChevronDown } from 'lucide-react'

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
			<div className="flex items-center justify-center min-h-dvh bg-background">
				<div className="flex flex-col items-center gap-3">
					<div className="animate-spin rounded-full h-10 w-10 border-[3px] border-primary/20 border-t-primary" />
					<p className="text-sm text-muted-foreground">Loading...</p>
				</div>
			</div>
		)
	}

	if (profiles.length === 0) {
		return (
			<div className="flex items-center justify-center min-h-dvh p-6 bg-background">
				<div className="text-center bg-amber-50 border border-amber-200 rounded-2xl p-8 sm:p-10 max-w-sm w-full shadow-sm">
					<div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-2xl flex items-center justify-center">
						<Warehouse className="w-8 h-8 text-amber-600" />
					</div>
					<h2 className="text-lg font-bold text-amber-900 mb-2">No profiles assigned</h2>
					<p className="text-sm text-amber-700 leading-relaxed">
						Ask your administrator to assign a POW Profile to your account to get started.
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
		<div className="min-h-dvh bg-background">
			{/* Header */}
			<header className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 text-white">
				<div className="absolute inset-0 opacity-10">
					<div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/20" />
					<div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/10" />
				</div>

				<div className="relative px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-5 sm:px-6 sm:pb-6 max-w-2xl mx-auto">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">POW</h1>
							<p className="text-indigo-200 text-sm mt-0.5">Point of Work</p>
						</div>
						{profiles.length > 1 && (
							<ProfileSwitcher
								profiles={profiles}
								selectedProfileName={selectedProfileName}
								onSelect={setSelectedProfileName}
							/>
						)}
					</div>

					{selectedProfile && (
						<div className="space-y-3">
							<div className="flex items-center gap-2">
								<span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
									{selectedProfile.name1}
								</span>
								<span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-xs">
									{selectedProfile.company}
								</span>
							</div>

							{warehouses && (
								<div className="relative inline-block">
									<Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
									<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
									<select
										className="appearance-none bg-white/10 backdrop-blur-sm text-white text-sm rounded-xl pl-9 pr-9 py-2.5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 w-full sm:w-auto min-w-[200px] cursor-pointer"
										value={defaultWarehouse ?? ''}
										onChange={(e) => setDefaultWarehouse(e.target.value || null)}
									>
										<option value="" className="text-gray-900">Select warehouse...</option>
										{warehouses.source_warehouses.map(wh => (
											<option key={wh} value={wh} className="text-gray-900">{wh}</option>
										))}
									</select>
								</div>
							)}
						</div>
					)}
				</div>
			</header>

			{/* Action Grid */}
			<main className="px-4 py-6 sm:px-6 sm:py-8 max-w-2xl mx-auto">
				<ActionGrid operations={operations} onAction={handleAction} />
			</main>

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
