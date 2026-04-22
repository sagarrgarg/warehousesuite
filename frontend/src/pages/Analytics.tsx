import { useMemo, type SVGProps } from 'react'
import { useFrappeGetCall } from 'frappe-react-sdk'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, BarChart3, Package, AlertTriangle, TrendingDown, TrendingUp, Timer, ShieldAlert } from 'lucide-react'
import { API } from '@/lib/api'
import { useSelectedProfile } from '@/hooks/useProfile'

interface TransferStat {
	warehouse: string
	total_transfers: number
	avg_mins_all: number | null
	avg_mins_6m: number | null
	avg_mins_30d: number | null
	avg_mins_7d: number | null
	count_6m: number
	count_30d: number
	count_7d: number
	min_mins_30d: number | null
	max_mins_30d: number | null
	pending_count: number
}

interface StockCountStat {
	warehouse: string
	total_counts: number
	total_items_counted: number
	items_with_variance: number
	total_abs_variance: number
	avg_abs_variance: number
	last_count_date: string | null
	accuracy_pct: number
}

interface HourlyBucket {
	hour: number
	count: number
}

interface ConcernRate {
	warehouse: string
	total_transfers: number
	transfers_with_concerns: number
	concern_pct: number
}

interface DailyVolume {
	warehouse: string
	day: string
	count: number
}

interface AnalyticsData {
	transfer_stats: TransferStat[]
	stock_count_stats: StockCountStat[]
	hourly_heatmap: HourlyBucket[]
	concern_rates: ConcernRate[]
	daily_volumes: DailyVolume[]
}

function formatMins(mins: number | null): string {
	if (mins == null) return '—'
	if (mins < 1) return '<1m'
	if (mins < 60) return `${Math.round(mins)}m`
	if (mins < 1440) return `${(mins / 60).toFixed(1)}h`
	return `${(mins / 1440).toFixed(1)}d`
}

function shortWh(name: string) {
	return name.replace(/ - [A-Z0-9]+$/i, '')
}

function getTrend(d7: number | null, d30: number | null, count7d: number, count30d: number): 'better' | 'worse' | 'flat' | null {
	if (d7 == null || d30 == null || count30d <= count7d) return null
	const prior23dTotal = (d30 * count30d) - (d7 * count7d)
	const prior23dAvg = prior23dTotal / (count30d - count7d)
	if (prior23dAvg <= 0) return null
	const pct = ((d7 - prior23dAvg) / prior23dAvg) * 100
	if (pct < -10) return 'better'
	if (pct > 10) return 'worse'
	return 'flat'
}

function TrendBadge({ d7, d30, count7d, count30d }: { d7: number | null; d30: number | null; count7d: number; count30d: number }) {
	const trend = getTrend(d7, d30, count7d, count30d)
	if (!trend || trend === 'flat') return null
	if (trend === 'better') return <TrendingDown className="w-3 h-3 text-emerald-500" />
	return <TrendingUp className="w-3 h-3 text-red-500" />
}

function getTimeColor(mins: number | null): string {
	if (mins == null) return 'text-slate-400'
	if (mins <= 15) return 'text-emerald-600 dark:text-emerald-400'
	if (mins <= 60) return 'text-amber-600 dark:text-amber-400'
	return 'text-red-600 dark:text-red-400'
}

export default function Analytics() {
	const navigate = useNavigate()
	const { selectedProfile, selectedProfileName } = useSelectedProfile()
	const profileName = selectedProfileName ?? null

	const { data, isLoading } = useFrappeGetCall<{ message: AnalyticsData }>(
		API.getWarehouseAnalytics,
		profileName ? { pow_profile: profileName } : undefined,
		profileName ? undefined : null,
	)
	const analytics = data?.message

	const sortedTransfers = useMemo(() => {
		if (!analytics?.transfer_stats) return []
		return [...analytics.transfer_stats].sort((a, b) => (b.count_30d || 0) - (a.count_30d || 0))
	}, [analytics?.transfer_stats])

	const stockScoreboard = useMemo(() => {
		if (!analytics) return []
		const countedMap = new Map(analytics.stock_count_stats.map(sc => [sc.warehouse, sc]))
		const allWarehouses = new Set<string>()
		for (const t of analytics.transfer_stats) allWarehouses.add(t.warehouse)
		for (const sc of analytics.stock_count_stats) allWarehouses.add(sc.warehouse)

		return [...allWarehouses].map(wh => {
			const sc = countedMap.get(wh)
			if (sc) return { ...sc, never_counted: false }
			return {
				warehouse: wh,
				total_counts: 0,
				total_items_counted: 0,
				items_with_variance: 0,
				total_abs_variance: 0,
				avg_abs_variance: 0,
				last_count_date: null,
				accuracy_pct: 0,
				never_counted: true,
			}
		}).sort((a, b) => {
			if (a.never_counted && !b.never_counted) return 1
			if (!a.never_counted && b.never_counted) return -1
			if (a.never_counted && b.never_counted) return a.warehouse.localeCompare(b.warehouse)
			return b.total_counts - a.total_counts
		})
	}, [analytics])

	const sparklineData = useMemo(() => {
		if (!analytics?.daily_volumes?.length) return []
		const byWh = new Map<string, Map<string, number>>()
		for (const d of analytics.daily_volumes) {
			if (!byWh.has(d.warehouse)) byWh.set(d.warehouse, new Map())
			byWh.get(d.warehouse)!.set(d.day, d.count)
		}

		const allDays: string[] = []
		const now = new Date()
		for (let i = 29; i >= 0; i--) {
			const d = new Date(now)
			d.setDate(d.getDate() - i)
			allDays.push(d.toLocaleDateString('en-CA'))
		}

		return [...byWh.entries()]
			.map(([warehouse, dayMap]) => {
				const data = allDays.map(d => dayMap.get(d) ?? 0)
				const total = data.reduce((s, v) => s + v, 0)
				const activeDays = data.filter(v => v > 0).length
				return { warehouse, data, total, avg: Math.round(total / 30) }
			})
			.sort((a, b) => b.total - a.total)
	}, [analytics?.daily_volumes])

	const totals = useMemo(() => {
		if (!sortedTransfers.length) return null
		const withData30d = sortedTransfers.filter(t => t.avg_mins_30d != null)
		const withData7d = sortedTransfers.filter(t => t.avg_mins_7d != null)
		return {
			total_transfers: sortedTransfers.reduce((s, t) => s + t.total_transfers, 0),
			count_30d: sortedTransfers.reduce((s, t) => s + t.count_30d, 0),
			count_7d: sortedTransfers.reduce((s, t) => s + t.count_7d, 0),
			avg_30d: withData30d.length
				? withData30d.reduce((s, t) => s + (t.avg_mins_30d ?? 0) * t.count_30d, 0) / withData30d.reduce((s, t) => s + t.count_30d, 0)
				: null,
			avg_7d: withData7d.length
				? withData7d.reduce((s, t) => s + (t.avg_mins_7d ?? 0) * t.count_7d, 0) / withData7d.reduce((s, t) => s + t.count_7d, 0)
				: null,
			pending: sortedTransfers.reduce((s, t) => s + t.pending_count, 0),
		}
	}, [sortedTransfers])

	return (
		<div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col animate-fade-in">
			<header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shrink-0">
				<div className="flex items-center gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
					<button onClick={() => navigate('/')} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded touch-manipulation">
						<ArrowLeft className="w-5 h-5" />
					</button>
					<div className="flex-1 min-w-0">
						<h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Warehouse Analytics</h2>
						<p className="text-[10px] text-slate-500 dark:text-slate-400">
							{selectedProfile ? (selectedProfile as any).name1 ?? profileName : 'All warehouses'}
							{' '}&middot; Transfer acceptance &middot; Stock count accuracy
						</p>
					</div>
					<button onClick={() => navigate('/so-analytics')} className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 rounded px-2 py-1 transition-colors cursor-pointer touch-manipulation">
						SO Analytics
					</button>
					<BarChart3 className="w-5 h-5 text-violet-500" />
				</div>
			</header>

			<div className="flex-1 overflow-y-auto overscroll-contain">
				<div className="max-w-6xl mx-auto p-3 space-y-4">

					{!profileName && (
						<div className="flex flex-col items-center py-20 text-center">
							<p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No profile selected</p>
							<p className="text-xs text-slate-500">Go back and select a POW profile to view analytics</p>
						</div>
					)}

					{profileName && isLoading && (
						<div className="flex items-center justify-center py-20">
							<div className="animate-pulse text-sm text-slate-500">Loading analytics...</div>
						</div>
					)}

					{!isLoading && analytics && (
						<>
							{/* Summary cards */}
							{totals && (
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
									<SummaryCard icon={<Package className="w-4 h-4 text-violet-500" />} label="Total Transfers" value={totals.total_transfers.toLocaleString()} sub="all time" />
									<SummaryCard icon={<Timer className="w-4 h-4 text-blue-500" />} label="Avg Accept (30d)" value={formatMins(totals.avg_30d)} sub={`${totals.count_30d} transfers`} color={getTimeColor(totals.avg_30d)} />
									<SummaryCard icon={<Clock className="w-4 h-4 text-emerald-500" />} label="Avg Accept (7d)" value={formatMins(totals.avg_7d)} sub={`${totals.count_7d} transfers`} color={getTimeColor(totals.avg_7d)} />
									<SummaryCard icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} label="Pending Now" value={String(totals.pending)} sub="awaiting receive" color={totals.pending > 0 ? 'text-amber-600' : 'text-emerald-600'} />
								</div>
							)}

							{/* Transfer acceptance table */}
							<section>
								<h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
									<Clock className="w-3.5 h-3.5 text-violet-500" />
									Transfer Acceptance Time by Warehouse
								</h3>
								<div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 overflow-x-auto">
									<table className="w-full text-[11px]">
										<thead>
											<tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-left">
												<th className="px-2.5 py-2 font-semibold">Warehouse</th>
												<th className="px-2 py-2 font-semibold text-center">Pending</th>
												<th className="px-2 py-2 font-semibold text-center">7d Avg</th>
												<th className="px-2 py-2 font-semibold text-center">30d Avg</th>
												<th className="px-2 py-2 font-semibold text-center">6m Avg</th>
												<th className="px-2 py-2 font-semibold text-center hidden sm:table-cell">30d Range</th>
												<th className="px-2 py-2 font-semibold text-center hidden sm:table-cell">30d Vol</th>
												<th className="px-2 py-2 font-semibold text-center">Trend</th>
											</tr>
										</thead>
										<tbody>
											{sortedTransfers.map((t, i) => (
												<tr key={t.warehouse} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/50'}>
													<td className="px-2.5 py-2 font-semibold text-slate-800 dark:text-slate-200 max-w-[180px] truncate" title={t.warehouse}>
														{shortWh(t.warehouse)}
													</td>
													<td className="px-2 py-2 text-center">
														{t.pending_count > 0
															? <span className="inline-flex items-center justify-center min-w-[18px] px-1 py-px rounded-full text-[9px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">{t.pending_count}</span>
															: <span className="text-slate-300 dark:text-slate-600">0</span>
														}
													</td>
													<td className={`px-2 py-2 text-center font-bold tabular-nums ${getTimeColor(t.avg_mins_7d)}`}>
														{formatMins(t.avg_mins_7d)}
													</td>
													<td className={`px-2 py-2 text-center font-bold tabular-nums ${getTimeColor(t.avg_mins_30d)}`}>
														{formatMins(t.avg_mins_30d)}
													</td>
													<td className={`px-2 py-2 text-center tabular-nums ${getTimeColor(t.avg_mins_6m)}`}>
														{formatMins(t.avg_mins_6m)}
													</td>
													<td className="px-2 py-2 text-center text-slate-500 dark:text-slate-400 tabular-nums hidden sm:table-cell">
														{t.min_mins_30d != null ? `${formatMins(t.min_mins_30d)}–${formatMins(t.max_mins_30d)}` : '—'}
													</td>
													<td className="px-2 py-2 text-center text-slate-500 dark:text-slate-400 tabular-nums hidden sm:table-cell">
														{t.count_30d || '—'}
													</td>
													<td className="px-2 py-2 text-center">
														<TrendBadge d7={t.avg_mins_7d} d30={t.avg_mins_30d} count7d={t.count_7d} count30d={t.count_30d} />
													</td>
												</tr>
											))}
											{sortedTransfers.length === 0 && (
												<tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">No transfer data</td></tr>
											)}
										</tbody>
									</table>
								</div>
							</section>

							{/* Stock count scoreboard */}
							<section>
								<h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
									<Package className="w-3.5 h-3.5 text-emerald-500" />
									Stock Count Accuracy Scoreboard
								</h3>
								{stockScoreboard.length === 0 ? (
									<div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 px-3 py-8 text-center text-slate-400 text-xs">
										No warehouses found
									</div>
								) : (
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
										{stockScoreboard.map(sc => (
											<div key={sc.warehouse} className={`rounded border p-3 ${sc.never_counted ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
												<p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate mb-2" title={sc.warehouse}>
													{shortWh(sc.warehouse)}
												</p>
												{sc.never_counted ? (
													<div className="flex items-center gap-2 py-3">
														<AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
														<div>
															<p className="text-xs font-bold text-red-600 dark:text-red-400">Never counted</p>
															<p className="text-[9px] text-red-500/70 dark:text-red-400/60">No stock count has been performed on this warehouse</p>
														</div>
													</div>
												) : (
													<>
														<div className="flex items-end gap-3 mb-2">
															<div>
																<p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Accuracy</p>
																<p className={`text-lg font-bold tabular-nums ${sc.accuracy_pct >= 95 ? 'text-emerald-600' : sc.accuracy_pct >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
																	{sc.accuracy_pct}%
																</p>
															</div>
															<div className="flex-1">
																<div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
																	<div
																		className={`h-full rounded-full ${sc.accuracy_pct >= 95 ? 'bg-emerald-500' : sc.accuracy_pct >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
																		style={{ width: `${Math.min(sc.accuracy_pct, 100)}%` }}
																	/>
																</div>
															</div>
														</div>
														<div className="grid grid-cols-3 gap-2 text-[9px]">
															<div>
																<p className="text-slate-500 dark:text-slate-400">Counts</p>
																<p className="font-bold text-slate-700 dark:text-slate-300">{sc.total_counts}</p>
															</div>
															<div>
																<p className="text-slate-500 dark:text-slate-400">Variances</p>
																<p className="font-bold text-red-600">{sc.items_with_variance}/{sc.total_items_counted}</p>
															</div>
															<div>
																<p className="text-slate-500 dark:text-slate-400">Avg Diff</p>
																<p className="font-bold text-slate-700 dark:text-slate-300">{sc.avg_abs_variance}</p>
															</div>
														</div>
														{sc.last_count_date && (
															<p className="text-[8px] text-slate-400 mt-2">
																Last count: {new Date(sc.last_count_date.replace(' ', 'T')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
															</p>
														)}
													</>
												)}
											</div>
										))}
									</div>
								)}
							</section>

							{/* Busiest hours heatmap */}
							<section>
								<h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
									<Clock className="w-3.5 h-3.5 text-violet-500" />
									Busiest Hours (last 30 days)
								</h3>
								{analytics.hourly_heatmap.length > 0 ? (
									<HourlyHeatmap buckets={analytics.hourly_heatmap} />
								) : (
									<div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 px-3 py-8 text-center text-slate-400 text-xs">
										No transfer activity in last 30 days
									</div>
								)}
							</section>

							{/* Concern rate */}
							{analytics.concern_rates.length > 0 && (
								<section>
									<h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
										<ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
										Transfer Concern Rate (last 30 days)
									</h3>
									<div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 overflow-x-auto">
										<table className="w-full text-[11px]">
											<thead>
												<tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-left">
													<th className="px-2.5 py-2 font-semibold">Warehouse</th>
													<th className="px-2 py-2 font-semibold text-center">Transfers</th>
													<th className="px-2 py-2 font-semibold text-center">With Concerns</th>
													<th className="px-2 py-2 font-semibold text-center">Rate</th>
													<th className="px-2 py-2 font-semibold w-24"></th>
												</tr>
											</thead>
											<tbody>
												{analytics.concern_rates.map((c, i) => (
													<tr key={c.warehouse} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/50'}>
														<td className="px-2.5 py-2 font-semibold text-slate-800 dark:text-slate-200 max-w-[180px] truncate" title={c.warehouse}>
															{shortWh(c.warehouse)}
														</td>
														<td className="px-2 py-2 text-center tabular-nums text-slate-500 dark:text-slate-400">{c.total_transfers}</td>
														<td className="px-2 py-2 text-center tabular-nums">
															{c.transfers_with_concerns > 0
																? <span className="font-bold text-amber-600">{c.transfers_with_concerns}</span>
																: <span className="text-slate-300 dark:text-slate-600">0</span>
															}
														</td>
														<td className={`px-2 py-2 text-center font-bold tabular-nums ${c.concern_pct === 0 ? 'text-emerald-600' : c.concern_pct < 2 ? 'text-amber-600' : 'text-red-600'}`}>
															{c.concern_pct}%
														</td>
														<td className="px-2 py-2">
															<div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
																<div
																	className={`h-full rounded-full ${c.concern_pct === 0 ? 'bg-emerald-500' : c.concern_pct < 2 ? 'bg-amber-500' : 'bg-red-500'}`}
																	style={{ width: `${Math.max(c.concern_pct, c.concern_pct > 0 ? 3 : 0)}%` }}
																/>
															</div>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</section>
							)}

							{/* Daily volume sparklines */}
							{sparklineData.length > 0 && (
								<section>
									<h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
										<BarChart3 className="w-3.5 h-3.5 text-violet-500" />
										Daily Transfer Volume (last 30 days)
									</h3>
									<div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
										{sparklineData.map(({ warehouse, data, total, avg }) => (
											<div key={warehouse} className="flex items-center gap-3 px-2.5 py-2">
												<div className="flex-1 min-w-0">
													<p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate" title={warehouse}>
														{shortWh(warehouse)}
													</p>
													<p className="text-[9px] text-slate-400 tabular-nums">
														{total} total &middot; {avg}/day avg
													</p>
												</div>
												<Sparkline data={data} />
											</div>
										))}
									</div>
								</section>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	)
}

function SummaryCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color?: string }) {
	return (
		<div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 p-2.5">
			<div className="flex items-center gap-1.5 mb-1">
				{icon}
				<span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">{label}</span>
			</div>
			<p className={`text-lg font-bold tabular-nums ${color || 'text-slate-900 dark:text-slate-100'}`}>{value}</p>
			<p className="text-[9px] text-slate-400">{sub}</p>
		</div>
	)
}

function Sparkline({ data, width = 120, height = 24 }: { data: number[]; width?: number; height?: number }) {
	if (!data.length) return null
	const max = Math.max(...data, 1)
	const step = width / Math.max(data.length - 1, 1)
	const points = data.map((v, i) => `${i * step},${height - (v / max) * (height - 2) - 1}`)
	const fillPoints = [...points, `${(data.length - 1) * step},${height}`, `0,${height}`]
	return (
		<svg width={width} height={height} className="shrink-0">
			<polygon points={fillPoints.join(' ')} fill="currentColor" className="text-violet-100 dark:text-violet-950/60" />
			<polyline points={points.join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet-500" />
		</svg>
	)
}

function HourlyHeatmap({ buckets }: { buckets: HourlyBucket[] }) {
	const byHour = new Map(buckets.map(b => [b.hour, b.count]))
	const max = Math.max(...buckets.map(b => b.count), 1)
	const barH = 64
	return (
		<div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 p-3">
			<div className="flex gap-[2px] items-end" style={{ height: barH }}>
				{Array.from({ length: 24 }, (_, h) => {
					const count = byHour.get(h) ?? 0
					const pct = count / max
					const px = count === 0 ? 2 : Math.max(Math.round(pct * barH), 3)
					const intensity = count === 0 ? 'bg-slate-100 dark:bg-slate-800'
						: pct > 0.75 ? 'bg-violet-600 dark:bg-violet-500'
						: pct > 0.5 ? 'bg-violet-400 dark:bg-violet-600'
						: pct > 0.25 ? 'bg-violet-300 dark:bg-violet-700'
						: 'bg-violet-200 dark:bg-violet-800'
					return (
						<div key={h} className="flex-1" title={`${h}:00 — ${count} transfers`}>
							<div className={`w-full rounded-sm ${intensity}`} style={{ height: px }} />
						</div>
					)
				})}
			</div>
			<div className="flex gap-[2px] mt-1">
				{Array.from({ length: 24 }, (_, h) => (
					<div key={h} className="flex-1 text-center text-[7px] text-slate-400 tabular-nums">
						{h % 3 === 0 ? `${h}` : ''}
					</div>
				))}
			</div>
		</div>
	)
}
