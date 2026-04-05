import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrappeGetCall } from 'frappe-react-sdk'
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
import WOManufactureModal from '@/components/manufacturing/WOManufactureModal'
import WORequestMaterialsModal from '@/components/manufacturing/WORequestMaterialsModal'
import SalesOrderPendingReportModal from '@/components/reports/SalesOrderPendingReportModal'
import { Warehouse, ArrowLeftRight, Hammer, ArrowDownToLine, Sun, Moon, Filter, X } from 'lucide-react'
import { API } from '@/lib/api'
import ItemSearchInput, { type ItemSearchInputHandle } from '@/components/shared/ItemSearchInput'
import { useTheme } from '@/hooks/useTheme'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { WODetail, DropdownItem } from '@/types'

function useLiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

type ModalType = 'transfer-send' | 'stock-count' | 'item-inquiry' | 'so-pending-report' | null
type MobileTab = 'work-orders' | 'requests' | 'incoming'

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
  } = usePendingPowReceives(selectedProfileName)


  const {
    workOrders,
    isLoading: woLoading,
    refresh: refreshWOs,
  } = usePendingWorkOrders(allWarehouseNames.length > 0 ? allWarehouseNames : null)

  const { data: filterItemsData } = useFrappeGetCall<{ message: DropdownItem[] }>(
    API.getItemsForDropdown,
    {},
  )
  const filterItems = filterItemsData?.message ?? []
  const [itemFilterCode, setItemFilterCode] = useState<string | null>(null)
  const itemFilterInputRef = useRef<ItemSearchInputHandle>(null)

  const filteredMRs = useMemo(() => {
    if (!itemFilterCode) return pendingMRs
    return pendingMRs.filter(mr => mr.lines.some(l => l.item_code === itemFilterCode))
  }, [pendingMRs, itemFilterCode])

  const filteredReceives = useMemo(() => {
    if (!itemFilterCode) return pendingReceives
    return pendingReceives.filter(g =>
      (g.items || []).some(it => it.item_code === itemFilterCode),
    )
  }, [pendingReceives, itemFilterCode])

  useEffect(() => {
    setItemFilterCode(null)
  }, [selectedProfileName])

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [fulfillMR, setFulfillMR] = useState<string | null>(null)
  const [showRaiseMR, setShowRaiseMR] = useState(false)

  // WO modal state
  const [showCreateWO, setShowCreateWO] = useState(false)
  const [activeWOName, setActiveWOName] = useState<string | null>(null)
  const [woDetailAction, setWoDetailAction] = useState<'manufacture' | 'request' | null>(null)
  const [woForAction, setWoForAction] = useState<WODetail | null>(null)

  // Mobile tab (work orders first; manufacturing-only tab removed — use WO panel + action bar)
  const [mobileTab, setMobileTab] = useState<MobileTab>('work-orders')

  const blockGlobalItemTypeahead =
    Boolean(activeModal) ||
    Boolean(fulfillMR) ||
    showRaiseMR ||
    showCreateWO ||
    Boolean(activeWOName) ||
    Boolean(woDetailAction)

  useEffect(() => {
    if (blockGlobalItemTypeahead) return
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target
      if (t instanceof HTMLElement) {
        const tag = t.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        if (t.isContentEditable) return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key.length !== 1) return
      const handle = itemFilterInputRef.current
      if (!handle) return
      handle.ingestPrintableKey(e.key)
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [blockGlobalItemTypeahead])

  const { theme, toggle: toggleTheme } = useTheme()
  const smUp = useMediaQuery('(min-width: 640px)')

  const now = useLiveClock()

  const dateLabel = smUp
    ? now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
    : now.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const timeLabel = smUp
    ? now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

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
      <div className="flex items-center justify-center min-h-dvh bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 dark:border-slate-600 border-t-slate-300" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-50 dark:bg-slate-900">
        <div className="text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-8 max-w-sm w-full">
          <Warehouse className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">No profiles assigned</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Ask your administrator to assign a POW Profile to your account.</p>
        </div>
      </div>
    )
  }

  const handleAction = (action: string) => {
    switch (action) {
      case 'transfer-send': case 'stock-count': case 'item-inquiry': case 'so-pending-report':
        setActiveModal(action as ModalType)
        break
    }
  }

  const pendingReceiveCount = filteredReceives.filter(r => r.status !== 'Complete').length
  const pendingReceiveTotal = pendingReceives.filter(r => r.status !== 'Complete').length
  const shortfallWOCount = workOrders.filter(wo => wo.shortfall_count > 0).length

  const TABS: { id: MobileTab; label: string; count?: number; icon: React.ReactNode; accent: string; activeBg: string; activeDot: string }[] = [
    {
      id: 'work-orders',
      label: 'WO',
      count: workOrders.length,
      icon: <Hammer className="w-4 h-4" />,
      accent: 'text-purple-700 dark:text-purple-400',
      activeBg: 'bg-purple-500/15',
      activeDot: 'bg-purple-400',
    },
    {
      id: 'requests',
      label: 'Requests',
      count: filteredMRs.length,
      icon: <ArrowLeftRight className="w-4 h-4" />,
      accent: 'text-blue-600 dark:text-blue-400',
      activeBg: 'bg-blue-500/15',
      activeDot: 'bg-blue-400',
    },
    {
      id: 'incoming',
      label: 'Incoming',
      count: pendingReceiveCount,
      icon: <ArrowDownToLine className="w-4 h-4" />,
      accent: 'text-violet-600 dark:text-violet-400',
      activeBg: 'bg-violet-500/15',
      activeDot: 'bg-violet-400',
    },
  ]

  return (
    <div className="h-dvh bg-slate-100 dark:bg-slate-900 flex flex-col overflow-hidden">
      {/* ── System Bar ─────────────────────────────────────── */}
      <header className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 shrink-0 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-base font-black text-slate-900 dark:text-white tracking-tight shrink-0">POW</span>
            {selectedProfile && (
              <span
                className={`text-xs text-slate-600 dark:text-slate-300 truncate min-w-0 ${
                  profiles.length > 1 ? 'hidden sm:inline' : ''
                } max-w-[min(40vw,10rem)] sm:max-w-[14rem]`}
                title={selectedProfile.name1 ?? selectedProfile.name}
              >
                {selectedProfile.name1 ?? selectedProfile.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="flex flex-col items-end leading-none sm:flex-row sm:items-center sm:gap-1.5 sm:leading-normal">
              <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {dateLabel}
              </span>
              <span className="text-[11px] sm:text-sm font-mono text-slate-700 dark:text-slate-200 tabular-nums">
                {timeLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-8 h-8 sm:w-7 sm:h-7 shrink-0 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                : <Moon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              }
            </button>
            <ProfileSwitcher profiles={profiles} selectedProfileName={selectedProfileName} onSelect={setSelectedProfileName} />
          </div>
        </div>
      </header>

      {/* ── Status summary (2×2 on narrow screens, row on sm+) ─ */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-2.5 sm:px-3 py-2 sm:py-1 shrink-0 grid grid-cols-2 sm:flex sm:flex-row sm:flex-wrap sm:items-center gap-x-3 gap-y-2 sm:gap-y-1 sm:gap-x-5 text-[10px] sm:text-xs">
        <span className="flex items-center gap-1 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
          <span className="text-slate-600 dark:text-slate-300 truncate">Work orders</span>
          <span className="text-slate-900 dark:text-white font-bold tabular-nums ml-auto sm:ml-0">{workOrders.length}</span>
          {shortfallWOCount > 0 && (
            <span className="hidden sm:inline text-[10px] text-red-600 dark:text-red-400 font-bold whitespace-nowrap">
              ({shortfallWOCount} short)
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
          <span className="text-slate-600 dark:text-slate-300 truncate">Requests</span>
          <span className="text-slate-900 dark:text-white font-bold tabular-nums ml-auto sm:ml-0" title={itemFilterCode ? `${filteredMRs.length} visible (filter on)` : undefined}>
            {filteredMRs.length}
            {itemFilterCode && pendingMRs.length !== filteredMRs.length && (
              <span className="text-slate-400 dark:text-slate-500 font-semibold">/{pendingMRs.length}</span>
            )}
          </span>
        </span>
        <span className="flex items-center gap-1 min-w-0 col-span-1">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
          <span className="text-slate-600 dark:text-slate-300 truncate">Incoming</span>
          <span className="text-slate-900 dark:text-white font-bold tabular-nums ml-auto sm:ml-0" title={itemFilterCode ? `${pendingReceiveCount} visible (filter on)` : undefined}>
            {pendingReceiveCount}
            {itemFilterCode && pendingReceiveCount !== pendingReceiveTotal && (
              <span className="text-slate-400 dark:text-slate-500 font-semibold">/{pendingReceiveTotal}</span>
            )}
          </span>
        </span>
        <span className="flex items-center gap-1 min-w-0 col-span-1">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
          <span className="text-slate-600 dark:text-slate-300 truncate">Sent</span>
          <span className="text-slate-900 dark:text-white font-bold tabular-nums ml-auto sm:ml-0">{sentBadge}</span>
        </span>
        {shortfallWOCount > 0 && (
          <span className="col-span-2 sm:hidden flex items-center justify-center gap-1 text-[9px] text-red-600 dark:text-red-400 font-bold -mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
            {shortfallWOCount} work order{shortfallWOCount !== 1 ? 's' : ''} short on materials
          </span>
        )}
      </div>

      {/* Item filter: MRs + incoming */}
      <div className="shrink-0 px-2.5 sm:px-3 py-1.5 bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 rounded-md border border-slate-200/90 dark:border-slate-600 bg-white/80 dark:bg-slate-800/60 px-2 py-1 sm:py-1.5">
          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 shrink-0" title="Filter transfer requests and incoming by line item">
            <Filter className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 hidden sm:inline">Item</span>
          </span>
          <div className="flex-1 min-w-0 sm:max-w-md">
            <ItemSearchInput
              ref={itemFilterInputRef}
              items={filterItems}
              value={itemFilterCode ?? ''}
              onSelect={code => setItemFilterCode(code ? code : null)}
              placeholder="Search or type anywhere to filter…"
            />
          </div>
          {itemFilterCode && (
            <button
              type="button"
              onClick={() => setItemFilterCode(null)}
              className="flex items-center gap-0.5 shrink-0 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 cursor-pointer"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Data Panels (desktop: WO → Transfer req → Incoming) ─ */}
      <section className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Work Orders */}
        <div className={`flex-1 flex-col min-h-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700 ${mobileTab === 'work-orders' ? 'flex' : 'hidden lg:flex'}`}>
          <PendingWorkOrdersPanel
            workOrders={workOrders}
            isLoading={woLoading}
            onOpen={(woName) => setActiveWOName(woName)}
            onCreateNew={() => setShowCreateWO(true)}
          />
        </div>

        {/* Transfer Requests */}
        <div className={`flex-1 flex-col min-h-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700 ${mobileTab === 'requests' ? 'flex' : 'hidden lg:flex'}`}>
          <PendingMaterialRequestsPanel
            requests={filteredMRs}
            isLoading={mrsLoading}
            onFulfill={(mrName) => setFulfillMR(mrName)}
            onRaise={() => setShowRaiseMR(true)}
            filterEmptyHint={itemFilterCode ? 'No open transfer requests include this item.' : undefined}
          />
        </div>

        {/* Incoming Transfers */}
        <div className={`flex-1 flex-col min-h-0 overflow-hidden ${mobileTab === 'incoming' ? 'flex' : 'hidden lg:flex'}`}>
          <PendingReceivesPanel
            receives={filteredReceives}
            isLoading={receivesLoading}
            company={company}
            onReceived={refreshAll}
            filterEmptyHint={itemFilterCode ? 'No incoming transfers include this item.' : undefined}
          />
        </div>
      </section>

      {/* ── Bottom Nav Tabs (mobile) ────────────────────────── */}
      <nav
        className="lg:hidden shrink-0 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-700/60 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
        aria-label="Dashboard sections"
      >
        <div className="flex">
          {TABS.map(tab => {
            const active = mobileTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMobileTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[3.25rem] transition-colors cursor-pointer touch-manipulation relative ${
                  active
                    ? tab.activeBg
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200/80 dark:active:bg-slate-800/80'
                }`}
              >
                {active && (
                  <span className={`absolute top-0 left-3 right-3 h-0.5 rounded-full ${tab.activeDot}`} aria-hidden />
                )}
                <span className={`transition-colors ${active ? tab.accent : ''}`}>
                  {tab.icon}
                </span>
                <span className={`text-[11px] font-bold tracking-wide transition-colors ${active ? tab.accent : ''}`}>
                  {tab.label}
                </span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`absolute top-1 right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-black px-1 leading-none shadow-sm ${
                      active
                        ? `${tab.activeDot} text-white`
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 ring-1 ring-slate-300/80 dark:ring-slate-600'
                    }`}
                  >
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Action Toolbar ─────────────────────────────────── */}
      <div className="shrink-0 overflow-visible bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-3 pt-0.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
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
        <TransferSendModal open onClose={closeModal} warehouses={warehouses} defaultWarehouse={null} />
      )}
      {activeModal === 'stock-count' && warehouses && selectedProfile && (
        <StockCountModal open onClose={closeModal} warehouses={warehouses} />
      )}
      {activeModal === 'item-inquiry' && warehouses && (
        <ItemInquiryModal open onClose={closeModal} allowedWarehouses={warehouses.source_warehouses.map(w => w.warehouse)} />
      )}
      {activeModal === 'so-pending-report' && selectedProfileName && (
        <SalesOrderPendingReportModal
          open
          onClose={closeModal}
          powProfileName={selectedProfileName}
        />
      )}

      {/* ── Work Order Modals ──────────────────────────────── */}
      {showCreateWO && warehouses && selectedProfileName && (
        <CreateWorkOrderModal
          open
          onClose={() => { setShowCreateWO(false); refreshWOs() }}
          warehouses={warehouses}
          powProfileName={selectedProfileName}
        />
      )}
      {activeWOName && !woDetailAction && (
        <WorkOrderDetailModal
          open
          woName={activeWOName}
          onClose={closeWODetail}
          onManufacture={(wo) => { setWoForAction(wo); setWoDetailAction('manufacture') }}
          onRequestMaterials={(wo) => { setWoForAction(wo); setWoDetailAction('request') }}
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
