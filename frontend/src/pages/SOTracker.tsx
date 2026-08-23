import { useState, useMemo, useEffect, useRef } from 'react'
import { useFrappeGetCall } from 'frappe-react-sdk'
import { useNavigate } from 'react-router-dom'
import {
	ArrowLeft, RefreshCw, Search, Truck, ExternalLink, ChevronDown, Calendar,
	Clock, AlertTriangle, AlertOctagon, PieChart, Bell, ChevronRight, X
} from 'lucide-react'
import { toast } from 'sonner'
import { API } from '@/lib/api'
import { useTheme } from '@/hooks/useTheme'
import { Sun, Moon } from 'lucide-react'
import NotificationBanner from '@/components/layout/NotificationBanner'

interface SalesOrderRow {
	order_no: string
	order_date: string
	customer: string
	customer_name: string
	age: number
	per_delivered: number
	status: string
	grand_total: number
	company: string
	delay_status: 'green' | 'yellow' | 'red'
}

interface DashboardData {
	counts: { green: number; yellow: number; red: number; total: number }
	bars: { green: number[]; yellow: number[]; red: number[] }
	trends: { green: { label: string; dir: string }; yellow: { label: string; dir: string }; red: { label: string; dir: string } }
	orders: SalesOrderRow[]
}

export default function SOTracker() {
	const navigate = useNavigate()
	const { theme, toggle: toggleTheme } = useTheme()

	const [activeBucket, setActiveBucket] = useState<'green' | 'yellow' | 'red' | null>(null)
	const [searchQuery, setSearchQuery] = useState('')
	const [company] = useState('')
	const [customer] = useState('')
	const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('all')
	const [showDateDropdown, setShowDateDropdown] = useState(false)
	const [openAlertPopover, setOpenAlertPopover] = useState<'yellow' | 'red' | null>(null)
	const [currentPage, setCurrentPage] = useState(1)
	const pageSize = 25

	const popoverRef = useRef<HTMLDivElement | null>(null)

	const fromDate = useMemo(() => {
		if (dateRange === 'all') return undefined
		const days = parseInt(dateRange, 10)
		const d = new Date()
		d.setDate(d.getDate() - days)
		return d.toISOString().split('T')[0]
	}, [dateRange])

	const { data: rawData, mutate: refreshData, isLoading } = useFrappeGetCall<{ message: DashboardData }>(
		API.getSODispatchDashboardData,
		{
			company: company || undefined,
			customer: customer || undefined,
			from_date: fromDate,
		}
	)

	const dashboardData = rawData?.message || {
		counts: { green: 0, yellow: 0, red: 0, total: 0 },
		bars: { green: [20, 35, 30, 55, 48, 75, 95], yellow: [60, 45, 38, 30, 22, 35, 42], red: [25, 38, 55, 68, 80, 88, 100] },
		trends: { green: { label: '8% vs lw', dir: 'up' }, yellow: { label: '4% vs lw', dir: 'down' }, red: { label: '15% vs lw', dir: 'up' } },
		orders: []
	}

	// Toast alert on load when critical orders exist
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

	// SVG Donut Calculations (Compact)
	const r = 26
	const c = 2 * Math.PI * r
	const dRed = (pctRed / 100) * c
	const dGreen = (pctGreen / 100) * c
	const dYellow = (pctYellow / 100) * c
	const offGreen = 0
	const offYellow = -dGreen
	const offRed = -(dGreen + dYellow)

	// Top 3 urgent orders for alert popovers
	const topRedOrders = useMemo(() => {
		return (dashboardData.orders || []).filter(o => o.delay_status === 'red').slice(0, 3)
	}, [dashboardData.orders])

	const topYellowOrders = useMemo(() => {
		return (dashboardData.orders || []).filter(o => o.delay_status === 'yellow').slice(0, 3)
	}, [dashboardData.orders])

	return (
		<div className="h-dvh bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col overflow-hidden font-sans">
			{/* Compact Top Header */}
			<header className="bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700/80 px-2.5 sm:px-3 py-1.5 flex items-center justify-between shrink-0 shadow-xs">
				<div className="flex items-center gap-2 sm:gap-2.5">
					<button
						type="button"
						onClick={() => navigate('/')}
						className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
						title="Back to POW Dashboard"
					>
						<ArrowLeft className="w-3.5 h-3.5" />
					</button>

					<div className="flex items-center gap-1.5">
						<div className="w-5.5 h-5.5 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
							<Truck className="w-3 h-3" />
						</div>
						<span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white tracking-tight">
							Sales Order Dispatch Tracker
						</span>
					</div>

					{/* Date Range Pill */}
					<div className="relative ml-1">
						<button
							type="button"
							onClick={() => setShowDateDropdown(!showDateDropdown)}
							className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 text-[11px] font-medium text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
						>
							<Calendar className="w-2.5 h-2.5 text-slate-500" />
							<span>{dateRange === 'all' ? 'All Time' : `Last ${dateRange} Days`}</span>
							<ChevronDown className="w-2.5 h-2.5 text-slate-400" />
						</button>

						{showDateDropdown && (
							<div className="absolute top-7 left-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 w-32 text-xs">
								{(['7', '30', '90', 'all'] as const).map(d => (
									<button
										key={d}
										type="button"
										onClick={() => { setDateRange(d); setShowDateDropdown(false); setCurrentPage(1) }}
										className="w-full text-left px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer text-[11px]"
									>
										{d === 'all' ? 'All Time' : `Last ${d} Days`}
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				<div className="flex items-center gap-1.5">
					<span className="text-[11px] text-slate-400 font-mono hidden sm:inline tabular-nums">
						{totalFiltered} orders
					</span>
					<button
						type="button"
						onClick={() => refreshData()}
						className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
						title="Refresh Data"
					>
						<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
					</button>
					<button
						type="button"
						onClick={toggleTheme}
						className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
						title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
					>
						{theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
					</button>
				</div>
			</header>

			{/* Integrated Notification Slider from WMSuite Settings */}
			<NotificationBanner forSOTracker={true} />

			{/* Main High-Density Container */}
			<div className="flex-1 p-2 sm:p-2.5 overflow-hidden flex flex-col gap-2 max-w-[1440px] w-full mx-auto relative">
				{/* 4-Card KPI Grid with Richer/Darker Gradients, Glows, Circular Badges, and Alert Dropdowns */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 shrink-0 relative">
					
					{/* Card 1: Under Time (Deeper Emerald Gradient) */}
					<div
						onClick={() => { setActiveBucket(activeBucket === 'green' ? null : 'green'); setCurrentPage(1) }}
						className={`relative overflow-hidden bg-gradient-to-br from-emerald-100/90 via-emerald-50/70 to-emerald-100/50 dark:from-emerald-950/70 dark:via-slate-850 dark:to-emerald-950/40 border rounded-lg p-2 sm:p-2.5 shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
							activeBucket === 'green' ? 'border-emerald-600 ring-2 ring-emerald-500/30 shadow-emerald-500/15' : 'border-emerald-300 dark:border-emerald-800 hover:border-emerald-500'
						}`}
					>
						{/* Ambient Glow */}
						<div className="pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full bg-emerald-500/20 dark:bg-emerald-400/15 blur-lg" />

						<div className="flex justify-between items-center z-1">
							<div className="flex items-center gap-1.5">
								<div className="w-5.5 h-5.5 rounded-full bg-emerald-200/90 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
									<Clock className="w-3 h-3" />
								</div>
								<span className="text-[10px] font-extrabold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">UNDER TIME &lt; 3D</span>
							</div>
							<span className="bg-emerald-200/90 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-[9px] font-bold px-1.5 py-0.2 rounded border border-emerald-400/50 dark:border-emerald-700">
								↗ 8% vs lw
							</span>
						</div>

						<div className="text-2xl font-black text-emerald-950 dark:text-white my-1 tracking-tight leading-none z-1">
							{dashboardData.counts.green}
						</div>

						<div className="h-5 w-full flex items-end gap-[2px] mt-0.5 z-1">
							{dashboardData.bars.green.map((h, i) => (
								<div key={i} className="flex-1 bg-emerald-600 hover:bg-emerald-500 rounded-t-2xs transition-all" style={{ height: `${h}%` }} />
							))}
						</div>
					</div>

					{/* Card 2: Delay (Deeper Amber Gradient + Alert Badge + Persistent Alert Bell) */}
					<div
						onClick={() => { setActiveBucket(activeBucket === 'yellow' ? null : 'yellow'); setCurrentPage(1) }}
						className={`relative overflow-visible bg-gradient-to-br from-amber-100/90 via-amber-50/70 to-amber-100/50 dark:from-amber-950/70 dark:via-slate-850 dark:to-amber-950/40 border rounded-lg p-2 sm:p-2.5 shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
							activeBucket === 'yellow' ? 'border-amber-600 ring-2 ring-amber-500/30 shadow-amber-500/15' : 'border-amber-300 dark:border-amber-800 hover:border-amber-500'
						}`}
					>
						{/* Ambient Glow */}
						<div className="pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full bg-amber-500/20 dark:bg-amber-400/15 blur-lg overflow-hidden" />

						<div className="flex justify-between items-center z-1">
							<div className="flex items-center gap-1.5">
								<div className="w-5.5 h-5.5 rounded-full bg-amber-200/90 dark:bg-amber-900/80 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
									<AlertTriangle className="w-3 h-3" />
								</div>
								<span className="text-[10px] font-extrabold text-amber-900 dark:text-amber-200 uppercase tracking-wider">DELAY 3-5 DAYS</span>
							</div>

							<div className="flex items-center gap-1">
								<span className="bg-amber-200/90 dark:bg-amber-900 text-amber-900 dark:text-amber-200 text-[9px] font-bold px-1.5 py-0.2 rounded border border-amber-400/50 dark:border-amber-700">
									∿ 4% vs lw
								</span>

								{/* Persistent Alert Bell for Yellow Delay */}
								{dashboardData.counts.yellow > 0 && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation()
											setOpenAlertPopover(openAlertPopover === 'yellow' ? null : 'yellow')
										}}
										className="relative p-1 rounded hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-700 dark:text-amber-300 transition-colors"
										title={`${dashboardData.counts.yellow} delayed orders — Click to preview`}
									>
										<Bell className="w-3 h-3" />
										<span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-1 ring-white dark:ring-slate-900" />
									</button>
								)}
							</div>
						</div>

						<div className="text-2xl font-black text-amber-950 dark:text-white my-1 tracking-tight leading-none z-1">
							{dashboardData.counts.yellow}
						</div>

						<div className="h-5 w-full flex items-end gap-[2px] mt-0.5 z-1">
							{dashboardData.bars.yellow.map((h, i) => (
								<div key={i} className="flex-1 bg-amber-600 hover:bg-amber-500 rounded-t-2xs transition-all" style={{ height: `${h}%` }} />
							))}
						</div>

						{/* Alert Quick Preview Popover for Yellow */}
						{openAlertPopover === 'yellow' && (
							<div
								ref={popoverRef}
								onClick={(e) => e.stopPropagation()}
								className="absolute top-full left-0 mt-1.5 z-50 w-72 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700/80 rounded-lg shadow-xl p-2.5 text-xs animate-in fade-in zoom-in-95 duration-150"
							>
								<div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-700">
									<div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
										<AlertTriangle className="w-3.5 h-3.5" />
										<span>Delayed Orders (3–5 Days)</span>
									</div>
									<button type="button" onClick={() => setOpenAlertPopover(null)} className="text-slate-400 hover:text-slate-600 p-0.5">
										<X className="w-3 h-3" />
									</button>
								</div>
								<div className="divide-y divide-slate-100 dark:divide-slate-700/60 my-1">
									{topYellowOrders.map(o => (
										<div key={o.order_no} className="py-1.5 flex justify-between items-center text-[10.5px]">
											<div className="truncate max-w-[170px]">
												<span className="font-mono font-bold text-slate-800 dark:text-slate-200">{o.order_no}</span>
												<p className="text-slate-500 dark:text-slate-400 truncate">{o.customer_name}</p>
											</div>
											<span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-bold px-1.5 py-0.2 rounded text-[9.5px]">
												{o.age}d
											</span>
										</div>
									))}
								</div>
								<button
									type="button"
									onClick={() => { setActiveBucket('yellow'); setOpenAlertPopover(null); setCurrentPage(1) }}
									className="w-full mt-1 pt-1.5 text-center text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center justify-center gap-1 border-t border-slate-100 dark:border-slate-700"
								>
									<span>View all {dashboardData.counts.yellow} orders</span>
									<ChevronRight className="w-3 h-3" />
								</button>
							</div>
						)}
					</div>

					{/* Card 3: Too Delay (Urgent Deep Crimson Gradient + Fast 1.2s Pulse Glow + Critical Badge + Alert Bell) */}
					<div
						onClick={() => { setActiveBucket(activeBucket === 'red' ? null : 'red'); setCurrentPage(1) }}
						className={`relative overflow-visible bg-gradient-to-br from-red-100/95 via-rose-50/80 to-red-100/60 dark:from-red-950/85 dark:via-slate-850 dark:to-red-950/50 border rounded-lg p-2 sm:p-2.5 shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md animate-[pulse_1.2s_ease-in-out_infinite] ${
							activeBucket === 'red'
								? 'border-red-600 ring-2 ring-red-500/50 shadow-red-500/30'
								: 'border-red-400 dark:border-red-700 shadow-[0_0_12px_rgba(239,68,68,0.25)] hover:border-red-600'
						}`}
					>
						{/* Ambient Red Glow */}
						<div className="pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full bg-red-500/25 dark:bg-red-500/20 blur-lg overflow-hidden" />

						<div className="flex justify-between items-center z-1">
							<div className="flex items-center gap-1.5">
								<div className="w-5.5 h-5.5 rounded-full bg-red-200/90 dark:bg-red-900/80 text-red-700 dark:text-red-300 flex items-center justify-center shrink-0 shadow-2xs">
									<AlertOctagon className="w-3 h-3" />
								</div>
								<span className="text-[10px] font-extrabold text-red-900 dark:text-red-200 uppercase tracking-wider">TOO DELAY &gt; 5D</span>
							</div>

							<div className="flex items-center gap-1">
								<span className="bg-red-600 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded shadow-xs flex items-center gap-1">
									<span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
									Critical
								</span>

								{/* Persistent Alert Bell for Red Too Delay */}
								{dashboardData.counts.red > 0 && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation()
											setOpenAlertPopover(openAlertPopover === 'red' ? null : 'red')
										}}
										className="relative p-1 rounded hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 transition-colors"
										title={`${dashboardData.counts.red} critical delayed orders — Click to preview`}
									>
										<Bell className="w-3 h-3 text-red-600 dark:text-red-400" />
										<span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-600 ring-1 ring-white dark:ring-slate-900 animate-pulse" />
									</button>
								)}
							</div>
						</div>

						<div className="flex items-baseline gap-1.5 my-1 z-1">
							<span className="text-2xl font-black text-red-600 dark:text-red-400 tracking-tight leading-none">
								{dashboardData.counts.red}
							</span>
							<span className="text-[10px] font-extrabold text-red-600 dark:text-red-400">∿ 15% vs lw</span>
						</div>

						<div className="h-5 w-full flex items-end gap-[2px] mt-0.5 z-1">
							{dashboardData.bars.red.map((h, i) => (
								<div key={i} className="flex-1 bg-red-600 hover:bg-red-500 rounded-t-2xs transition-all" style={{ height: `${h}%` }} />
							))}
						</div>

						{/* Alert Quick Preview Popover for Red */}
						{openAlertPopover === 'red' && (
							<div
								ref={popoverRef}
								onClick={(e) => e.stopPropagation()}
								className="absolute top-full left-0 mt-1.5 z-50 w-72 bg-white dark:bg-slate-800 border border-red-300 dark:border-red-700/80 rounded-lg shadow-xl p-2.5 text-xs animate-in fade-in zoom-in-95 duration-150"
							>
								<div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-700">
									<div className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
										<AlertOctagon className="w-3.5 h-3.5" />
										<span>Critical Orders (&gt; 5 Days)</span>
									</div>
									<button type="button" onClick={() => setOpenAlertPopover(null)} className="text-slate-400 hover:text-slate-600 p-0.5">
										<X className="w-3 h-3" />
									</button>
								</div>
								<div className="divide-y divide-slate-100 dark:divide-slate-700/60 my-1">
									{topRedOrders.map(o => (
										<div key={o.order_no} className="py-1.5 flex justify-between items-center text-[10.5px]">
											<div className="truncate max-w-[170px]">
												<span className="font-mono font-bold text-slate-800 dark:text-slate-200">{o.order_no}</span>
												<p className="text-slate-500 dark:text-slate-400 truncate">{o.customer_name}</p>
											</div>
											<span className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 font-bold px-1.5 py-0.2 rounded text-[9.5px]">
												{o.age}d
											</span>
										</div>
									))}
								</div>
								<button
									type="button"
									onClick={() => { setActiveBucket('red'); setOpenAlertPopover(null); setCurrentPage(1) }}
									className="w-full mt-1 pt-1.5 text-center text-red-600 dark:text-red-400 font-bold hover:underline flex items-center justify-center gap-1 border-t border-slate-100 dark:border-slate-700"
								>
									<span>View all {dashboardData.counts.red} critical orders</span>
									<ChevronRight className="w-3 h-3" />
								</button>
							</div>
						)}
					</div>

					{/* Card 4: Fulfillment Split (Deeper Indigo/Blue Gradient + PieChart Badge) */}
					<div
						onClick={() => { setActiveBucket(null); setCurrentPage(1) }}
						className={`relative overflow-hidden bg-gradient-to-br from-indigo-100/90 via-blue-50/70 to-indigo-100/50 dark:from-indigo-950/70 dark:via-slate-850 dark:to-blue-950/40 border rounded-lg p-2 sm:p-2.5 shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
							activeBucket === null ? 'border-indigo-600 ring-2 ring-indigo-500/30 shadow-indigo-500/15' : 'border-indigo-300 dark:border-indigo-800 hover:border-indigo-500'
						}`}
					>
						{/* Ambient Glow */}
						<div className="pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full bg-indigo-500/20 dark:bg-indigo-400/15 blur-lg" />

						<div className="flex justify-between items-center z-1">
							<div className="flex items-center gap-1.5">
								<div className="w-5.5 h-5.5 rounded-full bg-indigo-200/90 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-300 flex items-center justify-center shrink-0 shadow-2xs">
									<PieChart className="w-3 h-3" />
								</div>
								<span className="text-[10px] font-extrabold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">FULFILLMENT SPLIT</span>
							</div>
						</div>

						<div className="flex items-center justify-center relative my-0.5 z-1">
							<svg className="w-13 h-13 transform -rotate-90" viewBox="0 0 70 70">
								<circle cx="35" cy="35" r={r} fill="none" stroke="currentColor" strokeWidth="6.5" className="text-slate-200 dark:text-slate-700" />
								<circle cx="35" cy="35" r={r} fill="none" stroke="#dc2626" strokeWidth="6.5" strokeDasharray={`${dRed} ${c}`} strokeDashoffset={offRed} />
								<circle cx="35" cy="35" r={r} fill="none" stroke="#16a34a" strokeWidth="6.5" strokeDasharray={`${dGreen} ${c}`} strokeDashoffset={offGreen} />
								<circle cx="35" cy="35" r={r} fill="none" stroke="#eab308" strokeWidth="6.5" strokeDasharray={`${dYellow} ${c}`} strokeDashoffset={offYellow} />
							</svg>
							<div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
								<span className="font-bold text-xs text-slate-900 dark:text-white leading-none">{totalCount}</span>
								<span className="text-[8px] text-slate-400 font-semibold uppercase">Total</span>
							</div>
						</div>

						<div className="flex justify-between items-center px-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 z-1">
							<div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{pctGreen}%</div>
							<div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{pctYellow}%</div>
							<div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{pctRed}%</div>
						</div>
					</div>
				</div>

				{/* Active Dispatches Table Card */}
				<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs flex flex-col flex-1 min-h-0 overflow-hidden">
					{/* Compact Table Toolbar */}
					<div className="px-3 py-1.5 border-b border-slate-200/80 dark:border-slate-700/80 flex flex-wrap justify-between items-center gap-2 shrink-0">
						<div className="flex items-center gap-2">
							<h2 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Active Dispatches</h2>
							{activeBucket && (
								<span className="bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-0.2 rounded-full flex items-center gap-1">
									Filter: {activeBucket === 'red' ? 'Too Delay (>5d)' : activeBucket === 'yellow' ? 'Delay (3-5d)' : 'Under Time (<3d)'}
									<button type="button" onClick={() => setActiveBucket(null)} className="hover:text-blue-800">×</button>
								</span>
							)}
						</div>
						<div className="relative w-full sm:w-56">
							<Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
							<input
								type="text"
								value={searchQuery}
								onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
								placeholder="Search orders..."
								className="w-full pl-7 pr-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
							/>
						</div>
					</div>

					{/* Dense Table Viewport */}
					<div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
						<table className="w-full text-left border-collapse text-[11px]">
							<thead className="sticky top-0 z-10">
								<tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[9.5px]">
									<th className="w-0.75 p-0"></th>
									<th className="px-2.5 py-1.5">ORDER NO</th>
									<th className="px-2.5 py-1.5">DATE</th>
									<th className="px-2.5 py-1.5">CUSTOMER NAME</th>
									<th className="px-2.5 py-1.5">AGE</th>
									<th className="px-2.5 py-1.5">% DELIVERED</th>
									<th className="px-2.5 py-1.5">STATUS</th>
									<th className="px-2.5 py-1.5 text-right">ACTION</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
								{pagedOrders.length === 0 ? (
									<tr>
										<td colSpan={8} className="text-center py-8 text-slate-400 text-xs">
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
											<tr key={o.order_no} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/70 transition-colors h-[34px]">
												<td className={`w-0.75 p-0 ${borderCol}`}></td>
												<td className="px-2.5 py-1 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
													<a href={`/app/sales-order/${encodeURIComponent(o.order_no)}`} target="_blank" rel="noreferrer" className="hover:text-blue-600 hover:underline">
														{o.order_no}
													</a>
												</td>
												<td className="px-2.5 py-1 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[10.5px]">
													{o.order_date}
												</td>
												<td className="px-2.5 py-1 font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate text-[11px]" title={o.customer_name}>
													{o.customer_name}
												</td>
												<td className="px-2.5 py-1">
													<span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${ageBg}`}>
														{o.age} {o.age === 1 ? 'Day' : 'Days'}
													</span>
												</td>
												<td className="px-2.5 py-1">
													<div className="flex items-center gap-1.5">
														<div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
															<div className={`h-full rounded-full ${progFill}`} style={{ width: `${Math.min(o.per_delivered, 100)}%` }} />
														</div>
														<span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
															{o.per_delivered}%
														</span>
													</div>
												</td>
												<td className="px-2.5 py-1">
													<span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full border text-[9.5px] font-semibold ${statusPill}`}>
														<span className={`w-1.2 h-1.2 rounded-full ${statusDot}`} />
														{statusText}
													</span>
												</td>
												<td className="px-2.5 py-1 text-right">
													<a
														href={`/app/sales-order/${encodeURIComponent(o.order_no)}`}
														target="_blank"
														rel="noreferrer"
														className="inline-flex p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
														title="View Sales Order in Desk"
													>
														<ExternalLink className="w-3 h-3" />
													</a>
												</td>
											</tr>
										)
									})
								)}
							</tbody>
						</table>
					</div>

					{/* Compact Pagination Footer */}
					<div className="px-3 py-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 text-[11px] shrink-0">
						<span className="text-slate-500 dark:text-slate-400">
							Showing {totalFiltered > 0 ? startIdx + 1 : 0} to {Math.min(startIdx + pageSize, totalFiltered)} of {totalFiltered} entries
						</span>
						<div className="flex gap-1">
							<button
								type="button"
								disabled={currentPage <= 1}
								onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
								className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium cursor-pointer text-[10.5px]"
							>
								Previous
							</button>
							<button
								type="button"
								disabled={currentPage >= totalPages}
								onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
								className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium cursor-pointer text-[10.5px]"
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
