import { useState, useMemo, useEffect, useRef } from 'react'
import { useFrappeGetCall } from 'frappe-react-sdk'
import { useNavigate } from 'react-router-dom'
import {
	Truck,
	Clock,
	AlertTriangle,
	AlertOctagon,
	Search,
	ArrowLeft,
	Sun,
	Moon,
	RefreshCw,
	Calendar,
	ExternalLink,
	ChevronDown,
	Info,
	Lock,
	LayoutGrid,
	List,
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { API } from '@/lib/api'
import NotificationBanner from '@/components/layout/NotificationBanner'
import { toast } from 'sonner'

interface SalesOrderRow {
	order_no: string
	order_date: string
	customer: string
	customer_name: string
	age: number
	per_delivered: number
	status: string
	delay_status: 'green' | 'yellow' | 'red'
	grand_total: number
	company: string
}

interface SODashboardData {
	counts: {
		green: number
		yellow: number
		red: number
		total: number
	}
	bars: {
		green: number[]
		yellow: number[]
		red: number[]
	}
	trends: {
		green: { label: string; dir: 'up' | 'down' }
		yellow: { label: string; dir: 'up' | 'down' }
		red: { label: string; dir: 'up' | 'down' }
	}
	orders: SalesOrderRow[]
	can_read_so?: boolean
}

type DelayBucket = 'green' | 'yellow' | 'red' | null
type DateRange = '7' | '30' | '90' | 'all'

export default function SOTracker() {
	const navigate = useNavigate()
	const { theme, toggle: toggleTheme } = useTheme()
	const smUp = useMediaQuery('(min-width: 640px)')
	const lgUp = useMediaQuery('(min-width: 1024px)')

	const [dateRange, setDateRange] = useState<DateRange>('all')
	const [activeBucket, setActiveBucket] = useState<DelayBucket>(null)
	const [searchQuery, setSearchQuery] = useState('')
	const [currentPage, setCurrentPage] = useState(1)
	const [pageSize] = useState(25)
	const [showDateDropdown, setShowDateDropdown] = useState(false)
	const [openAlertPopover, setOpenAlertPopover] = useState<'red' | 'yellow' | null>(null)
	const [mobileViewMode, setMobileViewMode] = useState<'cards' | 'table'>('cards')

	const popoverRef = useRef<HTMLDivElement | null>(null)

	// Compute date filters
	const { from_date, to_date } = useMemo(() => {
		if (dateRange === 'all') return { from_date: null, to_date: null }
		const days = parseInt(dateRange, 10)
		const d = new Date()
		const toStr = d.toISOString().split('T')[0]
		d.setDate(d.getDate() - days)
		const fromStr = d.toISOString().split('T')[0]
		return { from_date: fromStr, to_date: toStr }
	}, [dateRange])

	const { data, mutate: refreshData, isLoading } = useFrappeGetCall<{ message: SODashboardData }>(
		API.getSODispatchDashboardData,
		{
			from_date: from_date || undefined,
			to_date: to_date || undefined,
		},
		undefined,
		{ refreshInterval: 60_000 }
	)

	const dashboardData: SODashboardData = useMemo(() => {
		if (data?.message) return data.message
		return {
			counts: { green: 0, yellow: 0, red: 0, total: 0 },
			bars: { green: [0, 0, 0, 0, 0, 0, 0], yellow: [0, 0, 0, 0, 0, 0, 0], red: [0, 0, 0, 0, 0, 0, 0] },
			trends: {
				green: { label: '0% vs lw', dir: 'up' },
				yellow: { label: '0% vs lw', dir: 'down' },
				red: { label: '0% vs lw', dir: 'up' },
			},
			orders: [],
			can_read_so: true,
		}
	}, [data])

	const canReadSO = dashboardData.can_read_so ?? true

	// High priority banner alert for critical delay orders (> 5 days)
	useEffect(() => {
		if (dashboardData.counts.red > 0) {
			toast.error(`Critical Alert: ${dashboardData.counts.red} orders are delayed > 5 days!`, {
				duration: 4000,
				id: 'so-delay-alert',
			})
		}
	}, [dashboardData.counts.red])

	// Close alert popovers on outside click
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
				setOpenAlertPopover(null)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	const filteredOrders = useMemo(() => {
		let list = dashboardData.orders || []
		if (activeBucket) {
			list = list.filter(o => o.delay_status === activeBucket)
		}
		if (searchQuery) {
			const q = searchQuery.toLowerCase()
			list = list.filter(o =>
				o.order_no.toLowerCase().includes(q) ||
				o.customer_name.toLowerCase().includes(q) ||
				(o.customer && o.customer.toLowerCase().includes(q))
			)
		}
		return list
	}, [dashboardData.orders, activeBucket, searchQuery])

	const totalFiltered = filteredOrders.length
	const totalPages = Math.ceil(totalFiltered / pageSize) || 1
	const startIdx = (currentPage - 1) * pageSize
	const pagedOrders = filteredOrders.slice(startIdx, startIdx + pageSize)

	const totalCount = dashboardData.counts.total || 0
	const pctGreen = totalCount > 0 ? Math.round((dashboardData.counts.green / totalCount) * 100) : 0
	const pctYellow = totalCount > 0 ? Math.round((dashboardData.counts.yellow / totalCount) * 100) : 0
	const pctRed = totalCount > 0 ? Math.round((dashboardData.counts.red / totalCount) * 100) : 0

	// SVG Donut Calculations
	const r = 24
	const c = 2 * Math.PI * r
	const dRed = (pctRed / 100) * c
	const dGreen = (pctGreen / 100) * c
	const dYellow = (pctYellow / 100) * c

	// Top 3 urgent orders for alert popovers
	const topRedOrders = useMemo(() => {
		return (dashboardData.orders || []).filter(o => o.delay_status === 'red').slice(0, 3)
	}, [dashboardData.orders])

	const topYellowOrders = useMemo(() => {
		return (dashboardData.orders || []).filter(o => o.delay_status === 'yellow').slice(0, 3)
	}, [dashboardData.orders])

	return (
		<div className="h-dvh bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col overflow-hidden font-sans select-none sm:select-auto">
			{/* Compact Responsive Header */}
			<header className="bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700/80 px-2.5 sm:px-4 py-2 flex items-center justify-between shrink-0 shadow-xs z-20">
				<div className="flex items-center gap-2 sm:gap-3 min-w-0">
					<button
						type="button"
						onClick={() => navigate('/')}
						className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors cursor-pointer touch-manipulation"
						title="Back to POW Dashboard"
					>
						<ArrowLeft className="w-4 h-4" />
					</button>

					<div className="flex items-center gap-1.5 min-w-0">
						<div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
							<Truck className="w-3.5 h-3.5" />
						</div>
						<span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white tracking-tight truncate">
							SO Dispatch Tracker
						</span>
					</div>

					{/* Date Range Selector */}
					<div className="relative ml-0.5 sm:ml-1 shrink-0">
						<button
							type="button"
							onClick={() => setShowDateDropdown(!showDateDropdown)}
							className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-2 sm:px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-600 text-[10.5px] sm:text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer touch-manipulation"
						>
							<Calendar className="w-3 h-3 text-slate-500" />
							<span>{dateRange === 'all' ? 'All Time' : `${dateRange}D`}</span>
							<ChevronDown className="w-2.5 h-2.5 text-slate-400" />
						</button>

						{showDateDropdown && (
							<div className="absolute top-8 left-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 w-32 text-xs animate-in fade-in zoom-in-95">
								{(['7', '30', '90', 'all'] as const).map(d => (
									<button
										key={d}
										type="button"
										onClick={() => { setDateRange(d); setShowDateDropdown(false); setCurrentPage(1) }}
										className={`w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-[11px] font-medium ${dateRange === d ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'}`}
									>
										{d === 'all' ? 'All Time' : `Last ${d} Days`}
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					<span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden md:inline tabular-nums bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
						{totalFiltered} orders
					</span>
					<button
						type="button"
						onClick={() => refreshData()}
						className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors cursor-pointer touch-manipulation"
						title="Refresh Data"
					>
						<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
					</button>
					<button
						type="button"
						onClick={toggleTheme}
						className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors cursor-pointer touch-manipulation"
						title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
					>
						{theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
					</button>
				</div>
			</header>

			{/* Integrated Notification Banner */}
			<NotificationBanner forSOTracker={true} />

			{/* Main Layout Container */}
			<div className="flex-1 p-2 sm:p-3 overflow-hidden flex flex-col gap-2 max-w-[1500px] w-full mx-auto relative pb-[max(0.5rem,env(safe-area-inset-bottom))]">
				{/* 4-Card KPI Grid: 2x2 on mobile, 4x1 on desktop */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0 relative">
					
					{/* Card 1: Under Time (<3D) */}
					<div
						onClick={() => { setActiveBucket(activeBucket === 'green' ? null : 'green'); setCurrentPage(1) }}
						className={`relative overflow-hidden bg-gradient-to-br from-emerald-100/90 via-emerald-50/70 to-emerald-100/50 dark:from-emerald-950/70 dark:via-slate-850 dark:to-emerald-950/40 border rounded-xl p-2 sm:p-2.5 shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 active:scale-[0.98] sm:hover:scale-[1.01] ${
							activeBucket === 'green' ? 'border-emerald-600 ring-2 ring-emerald-500/40 shadow-emerald-500/15' : 'border-emerald-300 dark:border-emerald-800 hover:border-emerald-500'
						}`}
					>
						<div className="pointer-events-none absolute -top-6 -right-6 w-16 h-16 rounded-full bg-emerald-500/20 dark:bg-emerald-400/15 blur-lg" />
						<div className="flex justify-between items-center z-1">
							<div className="flex items-center gap-1 sm:gap-1.5">
								<div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-emerald-200/90 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
									<Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
								</div>
								<span className="text-[9px] sm:text-[10px] font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
									&lt; 3D (ON TRACK)
								</span>
							</div>
							<span className="hidden sm:inline bg-emerald-200/90 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-[8.5px] font-bold px-1.5 py-0.2 rounded border border-emerald-400/50 dark:border-emerald-700">
								↗ 8% vs lw
							</span>
						</div>

						<div className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-white my-1 tracking-tight leading-none z-1">
							{dashboardData.counts.green}
						</div>

						<div className="h-4 sm:h-5 w-full flex items-end gap-[2px] mt-0.5 z-1">
							{dashboardData.bars.green.map((h, i) => (
								<div key={i} className="flex-1 bg-emerald-500/30 dark:bg-emerald-500/40 rounded-t-[1px] hover:bg-emerald-600 transition-colors" style={{ height: `${h}%` }} />
							))}
						</div>
					</div>

					{/* Card 2: Delay (3-5D) with Alert Dropdown */}
					<div
						onClick={() => { setActiveBucket(activeBucket === 'yellow' ? null : 'yellow'); setCurrentPage(1) }}
						className={`relative overflow-hidden bg-gradient-to-br from-amber-100/90 via-amber-50/70 to-amber-100/50 dark:from-amber-950/70 dark:via-slate-850 dark:to-amber-950/40 border rounded-xl p-2 sm:p-2.5 shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 active:scale-[0.98] sm:hover:scale-[1.01] ${
							activeBucket === 'yellow' ? 'border-amber-600 ring-2 ring-amber-500/40 shadow-amber-500/15' : 'border-amber-300 dark:border-amber-800 hover:border-amber-500'
						}`}
					>
						<div className="pointer-events-none absolute -top-6 -right-6 w-16 h-16 rounded-full bg-amber-500/20 dark:bg-amber-400/15 blur-lg" />
						<div className="flex justify-between items-center z-1">
							<div className="flex items-center gap-1 sm:gap-1.5">
								<div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-amber-200/90 dark:bg-amber-900/80 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
									<AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
								</div>
								<span className="text-[9px] sm:text-[10px] font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
									3-5D (DELAY)
								</span>
							</div>
							{dashboardData.counts.yellow > 0 && (
								<button
									type="button"
									onClick={e => { e.stopPropagation(); setOpenAlertPopover(openAlertPopover === 'yellow' ? null : 'yellow') }}
									className="bg-amber-500 hover:bg-amber-600 text-white text-[8.5px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-xs touch-manipulation"
								>
									{dashboardData.counts.yellow} Alert
								</button>
							)}
						</div>

						<div className="text-xl sm:text-2xl font-black text-amber-950 dark:text-white my-1 tracking-tight leading-none z-1">
							{dashboardData.counts.yellow}
						</div>

						<div className="h-4 sm:h-5 w-full flex items-end gap-[2px] mt-0.5 z-1">
							{dashboardData.bars.yellow.map((h, i) => (
								<div key={i} className="flex-1 bg-amber-500/30 dark:bg-amber-500/40 rounded-t-[1px] hover:bg-amber-600 transition-colors" style={{ height: `${h}%` }} />
							))}
						</div>

						{/* Yellow Alert Popover */}
						{openAlertPopover === 'yellow' && (
							<div ref={popoverRef} onClick={e => e.stopPropagation()} className="absolute top-10 left-2 right-2 sm:right-auto sm:w-64 z-50 bg-white dark:bg-slate-800 border-2 border-amber-400 rounded-xl shadow-xl p-2.5 text-xs animate-in fade-in zoom-in-95">
								<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5 mb-1.5">
									<span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 text-[11px]">
										<AlertTriangle className="w-3 h-3" /> Urgent Delayed Orders (3-5d)
									</span>
									<button type="button" onClick={() => setOpenAlertPopover(null)} className="text-slate-400 hover:text-slate-600">×</button>
								</div>
								<div className="space-y-1">
									{topYellowOrders.map(o => (
										<div key={o.order_no} className="flex justify-between items-center text-[10.5px] p-1 rounded bg-amber-50/60 dark:bg-amber-950/40">
											<span className="font-mono font-bold">{o.order_no}</span>
											<span className="text-amber-700 dark:text-amber-300 font-bold">{o.age} Days</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					{/* Card 3: Too Delay (>5D) with Critical Pulse and Alert Popover */}
					<div
						onClick={() => { setActiveBucket(activeBucket === 'red' ? null : 'red'); setCurrentPage(1) }}
						className={`relative overflow-hidden bg-gradient-to-br from-red-100/90 via-red-50/70 to-red-100/50 dark:from-red-950/70 dark:via-slate-850 dark:to-red-950/40 border rounded-xl p-2 sm:p-2.5 shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 active:scale-[0.98] sm:hover:scale-[1.01] ${
							activeBucket === 'red' ? 'border-red-600 ring-2 ring-red-500/40 shadow-red-500/15' : 'border-red-300 dark:border-red-800 hover:border-red-500'
						}`}
					>
						<div className="pointer-events-none absolute -top-6 -right-6 w-16 h-16 rounded-full bg-red-500/20 dark:bg-red-400/15 blur-lg" />
						<div className="flex justify-between items-center z-1">
							<div className="flex items-center gap-1 sm:gap-1.5">
								<div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-red-200/90 dark:bg-red-900/80 text-red-800 dark:text-red-300 flex items-center justify-center shrink-0">
									<AlertOctagon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
								</div>
								<span className="text-[9px] sm:text-[10px] font-black text-red-900 dark:text-red-200 uppercase tracking-wider">
									&gt; 5D (TOO DELAY)
								</span>
							</div>
							{dashboardData.counts.red > 0 && (
								<button
									type="button"
									onClick={e => { e.stopPropagation(); setOpenAlertPopover(openAlertPopover === 'red' ? null : 'red') }}
									className="bg-red-600 hover:bg-red-700 text-white text-[8.5px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-xs animate-pulse touch-manipulation"
								>
									{dashboardData.counts.red} Critical
								</button>
							)}
						</div>

						<div className="text-xl sm:text-2xl font-black text-red-950 dark:text-white my-1 tracking-tight leading-none z-1">
							{dashboardData.counts.red}
						</div>

						<div className="h-4 sm:h-5 w-full flex items-end gap-[2px] mt-0.5 z-1">
							{dashboardData.bars.red.map((h, i) => (
								<div key={i} className="flex-1 bg-red-500/30 dark:bg-red-500/40 rounded-t-[1px] hover:bg-red-600 transition-colors" style={{ height: `${h}%` }} />
							))}
						</div>

						{/* Red Alert Popover */}
						{openAlertPopover === 'red' && (
							<div ref={popoverRef} onClick={e => e.stopPropagation()} className="absolute top-10 left-2 right-2 sm:right-auto sm:w-64 z-50 bg-white dark:bg-slate-800 border-2 border-red-500 rounded-xl shadow-xl p-2.5 text-xs animate-in fade-in zoom-in-95">
								<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5 mb-1.5">
									<span className="font-bold text-red-700 dark:text-red-400 flex items-center gap-1 text-[11px]">
										<AlertOctagon className="w-3 h-3" /> Critical Orders (&gt;5d)
									</span>
									<button type="button" onClick={() => setOpenAlertPopover(null)} className="text-slate-400 hover:text-slate-600">×</button>
								</div>
								<div className="space-y-1">
									{topRedOrders.map(o => (
										<div key={o.order_no} className="flex justify-between items-center text-[10.5px] p-1 rounded bg-red-50/60 dark:bg-red-950/40">
											<span className="font-mono font-bold">{o.order_no}</span>
											<span className="text-red-700 dark:text-red-300 font-bold">{o.age} Days</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					{/* Card 4: Total & Mini Distribution */}
					<div
						onClick={() => { setActiveBucket(null); setCurrentPage(1) }}
						className={`relative overflow-hidden bg-gradient-to-br from-blue-100/80 via-slate-50 to-blue-50/60 dark:from-slate-800 dark:via-slate-850 dark:to-blue-950/30 border rounded-xl p-2 sm:p-2.5 shadow-xs flex items-center justify-between cursor-pointer transition-all duration-200 active:scale-[0.98] sm:hover:scale-[1.01] ${
							activeBucket === null ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
						}`}
					>
						<div className="flex flex-col justify-between h-full">
							<span className="text-[9px] sm:text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
								TOTAL ACTIVE
							</span>
							<div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none my-1">
								{totalCount}
							</div>
							<span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold">
								{pctGreen}% On Track
							</span>
						</div>

						{/* Mini SVG Donut */}
						<div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center">
							<svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
								<circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="6" />
								{totalCount > 0 && (
									<>
										<circle cx="32" cy="32" r={r} fill="none" stroke="#10b981" strokeWidth="6" strokeDasharray={`${dGreen} ${c}`} strokeDashoffset={0} />
										<circle cx="32" cy="32" r={r} fill="none" stroke="#f59e0b" strokeWidth="6" strokeDasharray={`${dYellow} ${c}`} strokeDashoffset={-dGreen} />
										<circle cx="32" cy="32" r={r} fill="none" stroke="#ef4444" strokeWidth="6" strokeDasharray={`${dRed} ${c}`} strokeDashoffset={-(dGreen + dYellow)} />
									</>
								)}
							</svg>
							<span className="absolute text-[9.5px] font-black text-slate-700 dark:text-slate-300 font-mono">
								{totalCount}
							</span>
						</div>
					</div>
				</div>

				{/* Active Dispatches Main Card */}
				<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs flex flex-col flex-1 min-h-0 overflow-hidden">
					{/* Responsive Toolbar */}
					<div className="px-3 py-2 border-b border-slate-200/80 dark:border-slate-700/80 flex flex-wrap justify-between items-center gap-2 shrink-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h2 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">Active Dispatches</h2>
							{activeBucket && (
								<span className="bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-200 dark:border-blue-800">
									Filter: {activeBucket === 'red' ? '>5d (Too Delay)' : activeBucket === 'yellow' ? '3-5d (Delay)' : '<3d (On Track)'}
									<button type="button" onClick={() => setActiveBucket(null)} className="hover:text-blue-800 dark:hover:text-blue-200 text-xs font-bold leading-none">×</button>
								</span>
							)}
							{!canReadSO && (
								<span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
									<Lock className="w-2.5 h-2.5 text-amber-500" /> ERP view restricted
								</span>
							)}
						</div>

						<div className="flex items-center gap-2 w-full sm:w-auto">
							{/* View Mode Switcher on Mobile (<640px) */}
							<div className="sm:hidden flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 border border-slate-200 dark:border-slate-600">
								<button
									type="button"
									onClick={() => setMobileViewMode('cards')}
									className={`p-1 rounded-md text-xs font-semibold ${mobileViewMode === 'cards' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 dark:text-slate-400'}`}
									title="Card View"
								>
									<LayoutGrid className="w-3.5 h-3.5" />
								</button>
								<button
									type="button"
									onClick={() => setMobileViewMode('table')}
									className={`p-1 rounded-md text-xs font-semibold ${mobileViewMode === 'table' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 dark:text-slate-400'}`}
									title="Table View"
								>
									<List className="w-3.5 h-3.5" />
								</button>
							</div>

							<div className="relative flex-1 sm:w-56">
								<Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
								<input
									type="text"
									value={searchQuery}
									onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
									placeholder="Search SO, customer..."
									className="w-full pl-8 pr-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
								/>
							</div>
						</div>
					</div>

					{/* Mobile Card View (< 640px and viewMode = 'cards') */}
					{!smUp && mobileViewMode === 'cards' ? (
						<div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
							{pagedOrders.length === 0 ? (
								<div className="text-center py-10 text-slate-400 text-xs">
									No open sales orders found matching your filters.
								</div>
							) : (
								pagedOrders.map(o => {
									const borderCol = o.delay_status === 'red' ? 'border-l-4 border-l-red-500' : (o.delay_status === 'yellow' ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-emerald-500')
									const ageBg = o.delay_status === 'red' ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400' : (o.delay_status === 'yellow' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400')
									const statusPill = o.delay_status === 'red' ? 'border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40' : (o.delay_status === 'yellow' ? 'border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40' : 'border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40')
									const progFill = o.delay_status === 'red' ? 'bg-red-500' : (o.delay_status === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500')

									return (
										<div
											key={o.order_no}
											className={`bg-slate-50/60 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 shadow-2xs space-y-2 ${borderCol}`}
										>
											{/* Top Row: Order No, Status Badge, Age */}
											<div className="flex items-center justify-between gap-2">
												<div className="flex items-center gap-1.5">
													{canReadSO ? (
														<a
															href={`/app/sales-order/${encodeURIComponent(o.order_no)}`}
															target="_blank"
															rel="noreferrer"
															className="font-mono font-black text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
														>
															{o.order_no}
															<ExternalLink className="w-2.5 h-2.5 opacity-60" />
														</a>
													) : (
														<span className="font-mono font-black text-xs text-slate-900 dark:text-white select-all">
															{o.order_no}
														</span>
													)}
												</div>

												<div className="flex items-center gap-1.5 shrink-0">
													<span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${statusPill}`}>
														{o.delay_status === 'red' ? 'Too Delay' : (o.delay_status === 'yellow' ? 'Delay' : 'On Track')}
													</span>
													<span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${ageBg}`}>
														{o.age} {o.age === 1 ? 'Day' : 'Days'}
													</span>
												</div>
											</div>

											{/* Customer & Date */}
											<div className="flex items-center justify-between text-xs">
												<span className="font-bold text-slate-800 dark:text-slate-200 truncate pr-2" title={o.customer_name}>
													{o.customer_name}
												</span>
												<span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0 font-mono">
													{o.order_date}
												</span>
											</div>

											{/* Delivery Progress */}
											<div className="space-y-1 pt-1 border-t border-slate-200/50 dark:border-slate-750">
												<div className="flex items-center justify-between text-[10px]">
													<span className="text-slate-500 dark:text-slate-400 font-semibold">Delivered</span>
													<span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">{o.per_delivered}%</span>
												</div>
												<div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
													<div className={`h-full rounded-full ${progFill}`} style={{ width: `${Math.min(o.per_delivered, 100)}%` }} />
												</div>
											</div>
										</div>
									)
								})
							)}
						</div>
					) : (
						/* Desktop Table View / Mobile Table View */
						<div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
							<table className="w-full text-left border-collapse text-[11px]">
								<thead className="sticky top-0 z-10">
									<tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[9.5px]">
										<th className="w-1 p-0"></th>
										<th className="px-3 py-2">ORDER NO</th>
										<th className="px-3 py-2">DATE</th>
										<th className="px-3 py-2">CUSTOMER NAME</th>
										<th className="px-3 py-2">AGE</th>
										<th className="px-3 py-2">% DELIVERED</th>
										<th className="px-3 py-2">STATUS</th>
										<th className="px-3 py-2 text-right">ACTION</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
									{pagedOrders.length === 0 ? (
										<tr>
											<td colSpan={8} className="text-center py-10 text-slate-400 text-xs">
												No open sales orders found matching your filters.
											</td>
										</tr>
									) : (
										pagedOrders.map(o => {
											const borderCol = o.delay_status === 'red' ? 'border-l-[3px] border-red-500' : (o.delay_status === 'yellow' ? 'border-l-[3px] border-amber-500' : 'border-l-[3px] border-emerald-500')
											const ageBg = o.delay_status === 'red' ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400' : (o.delay_status === 'yellow' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400')
											const statusPill = o.delay_status === 'red' ? 'border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40' : (o.delay_status === 'yellow' ? 'border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40' : 'border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40')
											const statusDot = o.delay_status === 'red' ? 'bg-red-500' : (o.delay_status === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500')
											const statusText = o.delay_status === 'red' ? 'Too Delay' : (o.delay_status === 'yellow' ? 'Delay' : 'On Track')
											const progFill = o.delay_status === 'red' ? 'bg-red-500' : (o.delay_status === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500')

											return (
												<tr key={o.order_no} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/70 transition-colors h-[36px]">
													<td className={`w-1 p-0 ${borderCol}`}></td>
													<td className="px-3 py-1.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
														{canReadSO ? (
															<a href={`/app/sales-order/${encodeURIComponent(o.order_no)}`} target="_blank" rel="noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">
																{o.order_no}
															</a>
														) : (
															<span className="select-all" title="ERP view restricted">
																{o.order_no}
															</span>
														)}
													</td>
													<td className="px-3 py-1.5 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[10.5px]">
														{o.order_date}
													</td>
													<td className="px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate text-[11px]" title={o.customer_name}>
														{o.customer_name}
													</td>
													<td className="px-3 py-1.5">
														<span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ageBg}`}>
															{o.age} {o.age === 1 ? 'Day' : 'Days'}
														</span>
													</td>
													<td className="px-3 py-1.5">
														<div className="flex items-center gap-1.5">
															<div className="w-14 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
																<div className={`h-full rounded-full ${progFill}`} style={{ width: `${Math.min(o.per_delivered, 100)}%` }} />
															</div>
															<span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
																{o.per_delivered}%
															</span>
														</div>
													</td>
													<td className="px-3 py-1.5">
														<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9.5px] font-semibold ${statusPill}`}>
															<span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
															{statusText}
														</span>
													</td>
													<td className="px-3 py-1.5 text-right">
														{canReadSO ? (
															<a
																href={`/app/sales-order/${encodeURIComponent(o.order_no)}`}
																target="_blank"
																rel="noreferrer"
																className="inline-flex p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
																title="View Sales Order in Desk"
															>
																<ExternalLink className="w-3.5 h-3.5" />
															</a>
														) : (
															<span className="inline-flex p-1 text-slate-300 dark:text-slate-600 cursor-not-allowed" title="ERP Sales Order view restricted">
																<Lock className="w-3.5 h-3.5" />
															</span>
														)}
													</td>
												</tr>
											)
										})
									)}
								</tbody>
							</table>
						</div>
					)}

					{/* Responsive Pagination Footer */}
					<div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/70 dark:bg-slate-900/40 text-[11px] shrink-0">
						<span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px]">
							Showing {totalFiltered > 0 ? startIdx + 1 : 0}–{Math.min(startIdx + pageSize, totalFiltered)} of {totalFiltered}
						</span>
						<div className="flex gap-1.5">
							<button
								type="button"
								disabled={currentPage <= 1}
								onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
								className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer text-[10.5px] touch-manipulation shadow-2xs"
							>
								Prev
							</button>
							<button
								type="button"
								disabled={currentPage >= totalPages}
								onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
								className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer text-[10.5px] touch-manipulation shadow-2xs"
							>
								Next
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
