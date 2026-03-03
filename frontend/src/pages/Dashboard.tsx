import { useState, useCallback } from 'react'
import { useSelectedProfile, useProfileOperations, useProfileWarehouses } from '@/hooks/useProfile'
import { useReceiveBadge, useSentBadge } from '@/hooks/useBadges'
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
		selectedProfile, selectedProfileName, setSelectedProfileName,
		defaultWarehouse, setDefaultWarehouse, profiles, isLoading,
	} = useSelectedProfile()

	const operations = useProfileOperations(selectedProfileName)
	const warehouses = useProfileWarehouses(selectedProfileName)

	const { count: receiveBadge, refresh: refreshReceive } = useReceiveBadge(defaultWarehouse)
	const { count: sentBadge, refresh: refreshSent } = useSentBadge(defaultWarehouse)

	const [activeModal, setActiveModal] = useState<ModalType>(null)

	const refreshBadges = useCallback(() => {
		refreshReceive()
		refreshSent()
	}, [refreshReceive, refreshSent])

	const closeModal = useCallback(() => {
		setActiveModal(null)
		refreshBadges()
	}, [refreshBadges])

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-dvh bg-background">
				<div className="flex flex-col items-center gap-3">
					<div className="animate-spin rounded-full h-10 w-10 border-[3px] border-primary/20 border-t-primary" />
					<p className="text-base text-muted-foreground">Loading...</p>
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
					<p className="text-base text-amber-700 leading-relaxed">
						Ask your administrator to assign a POW Profile to your account to get started.
					</p>
				</div>
			</div>
		)
	}

	const handleAction = (action: string) => {
		switch (action) {
			case 'transfer-send': case 'transfer-receive': case 'stock-count': case 'item-inquiry':
				setActiveModal(action as ModalType)
				break
			case 'purchase-receipt':  window.location.href = '/app/purchase-receipt'; break
			case 'delivery-note':     window.location.href = '/app/delivery-note'; break
			case 'manufacturing':     window.location.href = '/app/work-order'; break
			case 'repack':            window.location.href = '/app/stock-entry'; break
		}
	}

	const handleWarehouseChange = (wh: string) => {
		setDefaultWarehouse(wh || null)
		setTimeout(refreshBadges, 300)
	}

	return (
		<div className="min-h-dvh bg-background">
			<header className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 text-white">
				<div className="absolute inset-0 opacity-10">
					<div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/20" />
					<div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/10" />
				</div>
				<div className="relative px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-5 sm:px-6 sm:pb-6 max-w-2xl mx-auto">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h1 className="text-3xl font-extrabold tracking-tight">POW</h1>
							<p className="text-indigo-200 text-base mt-0.5">Point of Work</p>
						</div>
						{profiles.length > 1 && (
							<ProfileSwitcher profiles={profiles} selectedProfileName={selectedProfileName} onSelect={setSelectedProfileName} />
						)}
					</div>
					{selectedProfile && (
						<div className="space-y-3">
							<div className="flex items-center gap-2 flex-wrap">
								<span className="inline-flex items-center bg-white/15 backdrop-blur-sm rounded-full px-3.5 py-1.5 text-sm font-medium">{selectedProfile.name1}</span>
								<span className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-3.5 py-1.5 text-sm">{selectedProfile.company}</span>
							</div>
							{warehouses && (
								<div className="relative inline-block">
									<Warehouse className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
									<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 pointer-events-none" />
									<select
										className="appearance-none bg-white/10 backdrop-blur-sm text-white text-base rounded-xl pl-10 pr-10 py-3 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 w-full sm:w-auto min-w-[220px] cursor-pointer"
										value={defaultWarehouse ?? ''}
										onChange={e => handleWarehouseChange(e.target.value)}
									>
										<option value="" className="text-gray-900">Your Warehouse...</option>
										{warehouses.source_warehouses.map(wh => (
											<option key={wh.warehouse} value={wh.warehouse} className="text-gray-900">{wh.warehouse_name || wh.warehouse}</option>
										))}
									</select>
								</div>
							)}
						</div>
					)}
				</div>
			</header>

			<main className="px-4 py-6 sm:px-6 sm:py-8 max-w-2xl mx-auto">
				<ActionGrid operations={operations} onAction={handleAction} receiveBadge={receiveBadge} sentBadge={sentBadge} />
			</main>

			{activeModal === 'transfer-send' && warehouses && selectedProfile && (
				<TransferSendModal open onClose={closeModal} warehouses={warehouses} defaultWarehouse={defaultWarehouse} showOnlyStockItems={!!selectedProfile.show_only_stock_items} />
			)}
			{activeModal === 'transfer-receive' && warehouses && selectedProfile && (
				<TransferReceiveModal open onClose={closeModal} defaultWarehouse={defaultWarehouse} />
			)}
			{activeModal === 'stock-count' && warehouses && selectedProfile && (
				<StockCountModal open onClose={closeModal} warehouses={warehouses} />
			)}
			{activeModal === 'item-inquiry' && warehouses && (
				<ItemInquiryModal open onClose={closeModal} allowedWarehouses={warehouses.source_warehouses.map(w => w.warehouse)} />
			)}
		</div>
	)
}
