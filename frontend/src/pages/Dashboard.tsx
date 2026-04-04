import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSelectedProfile, useProfileOperations, useProfileWarehouses } from '@/hooks/useProfile'
import { useSentBadge } from '@/hooks/useBadges'
import { usePendingMaterialRequests } from '@/hooks/usePendingMaterialRequests'
import { usePendingPowReceives } from '@/hooks/usePendingPowReceives'
import { usePendingWorkOrders } from '@/hooks/usePendingWorkOrders'
import { useCompany } from '@/hooks/useBoot'
import ProfileSwitcher from '@/components/layout/ProfileSwitcher'
import ActionGrid from '@/components/layout/ActionGrid'
import PendingMaterialRequestsPanel from '@/components/dashboard/PendingMaterialRequestsPanel'
import PendingReceivesPanel from '@/components/dashboard/PendingReceivesPanel'
import PendingWorkOrdersPanel from '@/components/dashboard/PendingWorkOrdersPanel'
import MRFulfillmentModal from '@/components/dashboard/MRFulfillmentModal'
import RaiseMaterialRequestModal from '@/components/dashboard/RaiseMaterialRequestModal'
import TransferSendModal from '@/components/transfer/TransferSendModal'
import StockCountModal from '@/components/stock-count/StockCountModal'
import ItemInquiryModal from '@/components/item-inquiry/ItemInquiryModal'
import CreateWorkOrderModal from '@/components/manufacturing/CreateWorkOrderModal'
import WorkOrderDetailModal from '@/components/manufacturing/WorkOrderDetailModal'
import WOTransferModal from '@/components/manufacturing/WOTransferModal'
import WOManufactureModal from '@/components/manufacturing/WOManufactureModal'
import WORequestMaterialsModal from '@/components/manufacturing/WORequestMaterialsModal'
import { Warehouse, ArrowLeftRight, Hammer, ArrowDownToLine } from 'lucide-react'
import type { WODetail } from '@/types'

function useLiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

type ModalType = 'transfer-send' | 'stock-count' | 'item-inquiry' | null
type MobileTab = 'requests' | 'manufacturing' | 'incoming'

export default function Dashboard() {
  const {
    selectedProfile, selectedProfileName, setSelectedProfileName,
    profiles, isLoading,
  } = useSelectedProfile()

  const company = useCompany()
  const operations = useProfileOperations(selectedProfileName)
  const warehouses = useProfileWarehouses(selectedProfileName)

  const allWarehouseNames = useMemo(() => {
    if (!warehouses) return []
    const seen = new Set<string>()
    return [...warehouses.source_warehouses, ...(warehouses.target_warehouses ?? [])]
      .filter(wh => { if (seen.has(wh.warehouse)) return false; seen.add(wh.warehouse); return true })
      .map(wh => wh.warehouse)
  }, [warehouses])

  const sourceWarehouseNames = useMemo(
    () => warehouses?.source_warehouses.map(w => w.warehouse) ?? [],
    [warehouses],
  )

  const { count: sentBadge, refresh: refreshSent } = useSentBadge(sourceWarehouseNames)

  const {
    requests: pendingMRs,
    isLoading: mrsLoading,
    refresh: refreshMRs,
  } = usePendingMaterialRequests(sourceWarehouseNames.length > 0 ? sourceWarehouseNames : null)

  const {
    receives: pendingReceives,
    isLoading: receivesLoading,
    refresh: refreshReceives,
  } = usePendingPowReceives(allWarehouseNames)

  const {
    workOrders,
    isLoading: woLoading,
    refresh: refreshWOs,
  } = usePendingWorkOrders(allWarehouseNames.length > 0 ? allWarehouseNames : null)

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [fulfillMR, setFulfillMR] = useState<string | null>(null)
  const [showRaiseMR, setShowRaiseMR] = useState(false)

  // WO modal state
  const [showCreateWO, setShowCreateWO] = useState(false)
  const [activeWOName, setActiveWOName] = useState<string | null>(null)
  const [woDetailAction, setWoDetailAction] = useState<'transfer' | 'manufacture' | 'request' | null>(null)
  const [woForAction, setWoForAction] = useState<WODetail | null>(null)

  // Mobile tab
  const [mobileTab, setMobileTab] = useState<MobileTab>('requests')

  const now = useLiveClock()

  const refreshAll = useCallback(() => {
    refreshSent(); refreshMRs(); refreshReceives(); refreshWOs()
  }, [refreshSent, refreshMRs, refreshReceives, refreshWOs])

  const closeModal = useCallback(() => { setActiveModal(null); refreshAll() }, [refreshAll])
  const closeFulfillment = useCallback(() => { setFulfillMR(null); refreshAll() }, [refreshAll])
  const closeRaiseMR = useCallback(() => { setShowRaiseMR(false); refreshAll() }, [refreshAll])

  const closeWODetail = useCallback(() => {
    setActiveWOName(null)
    setWoDetailAction(null)
    setWoForAction(null)
    refreshAll()
  }, [refreshAll])

  const closeWOAction = useCallback(() => {
    setWoDetailAction(null)
    setWoForAction(null)
    refreshAll()
  }, [refreshAll])

  const handleWODone = useCallback(() => {
    setWoDetailAction(null)
    setWoForAction(null)
    setActiveWOName(null)
    refreshAll()
  }, [refreshAll])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-slate-300" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-900">
        <div className="text-center bg-slate-800 border border-slate-700 rounded p-8 max-w-sm w-full">
          <Warehouse className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h2 className="text-sm font-bold text-slate-200 mb-1">No profiles assigned</h2>
          <p className="text-xs text-slate-400">Ask your administrator to assign a POW Profile to your account.</p>
        </div>
      </div>
    )
  }

  const handleAction = (action: string) => {
    switch (action) {
      case 'transfer-send': case 'stock-count': case 'item-inquiry':
        setActiveModal(action as ModalType)
        break
      case 'manufacturing':
        setShowCreateWO(true)
        break
    }
  }

  const pendingReceiveCount = pendingReceives.filter(r => r.status !== 'Complete').length
  const shortfallWOCount = workOrders.filter(wo => wo.shortfall_count > 0).length

  const TABS: { id: MobileTab; label: string; count?: number; icon: React.ReactNode; accent: string; activeBg: string; activeDot: string }[] = [
    {
      id: 'requests',
      label: 'Requests',
      count: pendingMRs.length,
      icon: <ArrowLeftRight className="w-4 h-4" />,
      accent: 'text-blue-400',
      activeBg: 'bg-blue-500/15',
      activeDot: 'bg-blue-400',
    },
    {
      id: 'manufacturing',
      label: 'Mfg',
      count: workOrders.length,
      icon: <Hammer className="w-4 h-4" />,
      accent: 'text-purple-400',
      activeBg: 'bg-purple-500/15',
      activeDot: 'bg-purple-400',
    },
    {
      id: 'incoming',
      label: 'Incoming',
      count: pendingReceiveCount,
      icon: <ArrowDownToLine className="w-4 h-4" />,
      accent: 'text-violet-400',
      activeBg: 'bg-violet-500/15',
      activeDot: 'bg-violet-400',
    },
  ]

  return (
    <div className="h-dvh bg-slate-100 flex flex-col overflow-hidden">
      {/* ── System Bar ─────────────────────────────────────── */}
      <header className="bg-slate-900 text-slate-300 shrink-0">
        <div className="flex items-center justify-between px-3 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-black text-white tracking-tight">POW</span>
            {selectedProfile && (
              <span className="text-[10px] text-slate-400 truncate max-w-[120px] sm:max-w-none">
                {selectedProfile.name1 ?? selectedProfile.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-slate-500 tabular-nums hidden sm:inline">
              {now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <span className="text-[11px] font-mono text-slate-300 tabular-nums">
              {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <ProfileSwitcher profiles={profiles} selectedProfileName={selectedProfileName} onSelect={setSelectedProfileName} />
          </div>
        </div>
      </header>

      {/* ── Status Ticker ──────────────────────────────────── */}
      <div className="bg-slate-800 border-t border-slate-700 px-3 py-1 flex items-center gap-4 text-[10px] shrink-0 overflow-x-auto no-scrollbar">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="text-slate-400">Requests</span>
          <span className="text-white font-bold tabular-nums">{pendingMRs.length}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          <span className="text-slate-400">Work Orders</span>
          <span className="text-white font-bold tabular-nums">{workOrders.length}</span>
          {shortfallWOCount > 0 && (
            <span className="text-[9px] text-red-400 font-bold">({shortfallWOCount} short)</span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          <span className="text-slate-400">Incoming</span>
          <span className="text-white font-bold tabular-nums">{pendingReceiveCount}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          <span className="text-slate-400">Sent</span>
          <span className="text-white font-bold tabular-nums">{sentBadge}</span>
        </span>
      </div>

      {/* ── Data Panels ────────────────────────────────────── */}
      <section className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Transfer Requests */}
        <div className={`flex-1 flex-col min-h-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 ${mobileTab === 'requests' ? 'flex' : 'hidden lg:flex'}`}>
          <PendingMaterialRequestsPanel
            requests={pendingMRs}
            isLoading={mrsLoading}
            onFulfill={(mrName) => setFulfillMR(mrName)}
            onRaise={() => setShowRaiseMR(true)}
          />
        </div>

        {/* Work Orders */}
        <div className={`flex-1 flex-col min-h-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 ${mobileTab === 'manufacturing' ? 'flex' : 'hidden lg:flex'}`}>
          <PendingWorkOrdersPanel
            workOrders={workOrders}
            isLoading={woLoading}
            onOpen={(woName) => setActiveWOName(woName)}
            onCreateNew={() => setShowCreateWO(true)}
          />
        </div>

        {/* Incoming Transfers */}
        <div className={`flex-1 flex-col min-h-0 overflow-hidden ${mobileTab === 'incoming' ? 'flex' : 'hidden lg:flex'}`}>
          <PendingReceivesPanel
            receives={pendingReceives}
            isLoading={receivesLoading}
            company={company}
            onReceived={refreshAll}
          />
        </div>
      </section>

      {/* ── Bottom Nav Tabs (mobile) ────────────────────────── */}
      <div className="lg:hidden shrink-0 bg-slate-900 border-t border-slate-700/60">
        <div className="flex">
          {TABS.map(tab => {
            const active = mobileTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors cursor-pointer touch-manipulation relative ${
                  active ? tab.activeBg : 'hover:bg-slate-800'
                }`}
              >
                {/* active indicator bar */}
                {active && (
                  <span className={`absolute top-0 left-4 right-4 h-[2px] rounded-full ${tab.activeDot}`} />
                )}
                <span className={`transition-colors ${active ? tab.accent : 'text-slate-500'}`}>
                  {tab.icon}
                </span>
                <span className={`text-[10px] font-bold tracking-wide transition-colors ${active ? tab.accent : 'text-slate-500'}`}>
                  {tab.label}
                </span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`absolute top-1.5 right-[calc(50%-18px)] min-w-[16px] h-4 flex items-center justify-center rounded-full text-[8px] font-black px-1 leading-none ${
                    active
                      ? `${tab.activeDot} text-white`
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Action Toolbar ─────────────────────────────────── */}
      <div className="shrink-0 bg-slate-900 border-t border-slate-700 px-3 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        <ActionGrid operations={operations} onAction={handleAction} sentBadge={sentBadge} />
      </div>

      {/* ── Standard Modals ────────────────────────────────── */}
      {showRaiseMR && warehouses && selectedProfile && (
        <RaiseMaterialRequestModal open onClose={closeRaiseMR} warehouses={warehouses} defaultWarehouse={null} />
      )}
      {fulfillMR && warehouses && selectedProfile && (
        <MRFulfillmentModal open onClose={closeFulfillment} mrName={fulfillMR} company={selectedProfile.company} profileWarehouses={warehouses} sourceWarehouses={sourceWarehouseNames} defaultWarehouse={null} />
      )}
      {activeModal === 'transfer-send' && warehouses && selectedProfile && (
        <TransferSendModal open onClose={closeModal} warehouses={warehouses} defaultWarehouse={null} showOnlyStockItems={!!selectedProfile.show_only_stock_items} />
      )}
      {activeModal === 'stock-count' && warehouses && selectedProfile && (
        <StockCountModal open onClose={closeModal} warehouses={warehouses} />
      )}
      {activeModal === 'item-inquiry' && warehouses && (
        <ItemInquiryModal open onClose={closeModal} allowedWarehouses={warehouses.source_warehouses.map(w => w.warehouse)} />
      )}

      {/* ── Work Order Modals ──────────────────────────────── */}
      {showCreateWO && warehouses && (
        <CreateWorkOrderModal
          open
          onClose={() => { setShowCreateWO(false); refreshWOs() }}
          warehouses={warehouses}
        />
      )}
      {activeWOName && !woDetailAction && (
        <WorkOrderDetailModal
          open
          woName={activeWOName}
          onClose={closeWODetail}
          onTransferMaterials={(wo) => { setWoForAction(wo); setWoDetailAction('transfer') }}
          onManufacture={(wo) => { setWoForAction(wo); setWoDetailAction('manufacture') }}
          onRequestMaterials={(wo) => { setWoForAction(wo); setWoDetailAction('request') }}
        />
      )}
      {woDetailAction === 'transfer' && woForAction && (
        <WOTransferModal
          open
          wo={woForAction}
          onClose={closeWOAction}
          onDone={handleWODone}
        />
      )}
      {woDetailAction === 'manufacture' && woForAction && (
        <WOManufactureModal
          open
          wo={woForAction}
          onClose={closeWOAction}
          onDone={handleWODone}
        />
      )}
      {woDetailAction === 'request' && woForAction && warehouses && (
        <WORequestMaterialsModal
          open
          wo={woForAction}
          warehouses={warehouses}
          onClose={closeWOAction}
          onDone={handleWODone}
        />
      )}
    </div>
  )
}
