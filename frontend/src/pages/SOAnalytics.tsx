import { useMemo } from 'react'
import { useFrappeGetCall } from 'frappe-react-sdk'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Clock, AlertTriangle, MapPin, Users, Edit3, FileText, TrendingUp } from 'lucide-react'
import { API } from '@/lib/api'
import { useSelectedProfile } from '@/hooks/useProfile'

interface TurnaroundRow { period: string; order_count: number; avg_hrs_to_dn: number | null; avg_hrs_to_si: number | null }
interface NearlyComplete { name: string; customer_name: string; grand_total: number; per_delivered: number; per_billed: number; status: string; transaction_date: string | null; days_open: number }
interface PendingSummary { status: string; cnt: number; total_value: number }
interface ModRow { period: string; orders_modified: number; total_changes: number }
interface AmendRow { period: string; cnt: number }
interface CityRow { city: string; order_count: number; total_value: number; count_7d: number; count_30d: number }
interface CustomerRow { customer_name: string; order_count: number; total_value: number; count_7d: number; count_30d: number }

interface SOAnalyticsData {
	turnaround: TurnaroundRow[]
	nearly_complete: NearlyComplete[]
	nearly_complete_count: number
	ignore_count: number
	pending_summary: PendingSummary[]
	modifications: ModRow[]
	amendments: AmendRow[]
	top_cities: CityRow[]
	top_customers: CustomerRow[]
}

function formatHrs(h: number | null): string {
	if (h == null) return '—'
	if (h < 1) return '<1h'
	if (h < 24) return `${Math.round(h)}h`
	return `${(h / 24).toFixed(1)}d`
}

function formatCurrency(n: number): string {
	if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
	if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
	if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
	return `₹${n.toFixed(0)}`
}

function getPeriodVal(rows: { period: string }[], period: string) {
	return rows.find(r => r.period === period)
}

export default function SOAnalytics() {
	const navigate = useNavigate()
	const { selectedProfile, selectedProfileName } = useSelectedProfile()
	const profileName = selectedProfileName ?? null

	const { data, isLoading } = useFrappeGetCall<{ message: SOAnalyticsData }>(
		API.getSOAnalytics,
		profileName ? { pow_profile: profileName } : undefined,
		profileName ? undefined : null,
	)
	const analytics = data?.message

	const totalPending = useMemo(() => {
		if (!analytics?.pending_summary) return { count: 0, value: 0 }
		return {
			count: analytics.pending_summary.reduce((s, r) => s + r.cnt, 0),
			value: analytics.pending_summary.reduce((s, r) => s + r.total_value, 0),
		}
	}, [analytics?.pending_summary])

	return (
		<div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col animate-fade-in">
			<header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shrink-0">
				<div className="flex items-center gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
					<button onClick={() => navigate('/')} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded touch-manipulation">
						<ArrowLeft className="w-5 h-5" />
					</button>
					<div className="flex-1 min-w-0">
						<h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Sales Order Analytics</h2>
						<p className="text-[10px] text-slate-500 dark:text-slate-400">
							{selectedProfile ? (selectedProfile as any).name1 ?? profileName : 'Select profile'}
							{' '}&middot; Turnaround &middot; Pending &middot; Top cities & parties
						</p>
					</div>
					<ShoppingCart className="w-5 h-5 text-cyan-500" />
				</div>
			</header>

			<div className="flex-1 overflow-y-auto overscroll-contain">
				<div className="max-w-6xl mx-auto p-3 space-y-4">

					{!profileName && (
						<div className="flex flex-col items-center py-20 text-center">
							<p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No profile selected</p>
							<p className="text-xs text-slate-500">Go back and select a POW profile</p>
						</div>
					)}

					{profileName && isLoading && (
						<div className="flex items-center justify-center py-20">
							<div className="animate-pulse text-sm text-slate-500">Loading SO analytics...</div>
						</div>
					)}

					{profileName && !isLoading && analytics && (
						<>
							{/* Summary cards */}
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
								<Card icon={<FileText className="w-4 h-4 text-cyan-500" />} label="Pending Orders" value={String(totalPending.count)} sub={formatCurrency(totalPending.value)} />
								<Card icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} label=">80% Done, Still Open" value={String(analytics.nearly_complete_count)} sub="should be closed" color="text-amber-600" />
								<Card icon={<TrendingUp className="w-4 h-4 text-red-500" />} label=">95% Delivered" value={String(analytics.ignore_count)} sub="<5% remaining — ignore" color="text-red-600" />
								<Card icon={<Edit3 className="w-4 h-4 text-violet-500" />} label="Modified (30d)" value={String((getPeriodVal(analytics.modifications, '30d') ?? getPeriodVal(analytics.modifications, '7d'))?.orders_modified ?? 0)} sub={`${(getPeriodVal(analytics.modifications, '30d') ?? getPeriodVal(analytics.modifications, '7d'))?.total_changes ?? 0} total edits`} />
							</div>

							{/* Turnaround times */}
							<section>
								<h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
									<Clock className="w-3.5 h-3.5 text-cyan-500" />
									Order Turnaround Time
								</h3>
								<div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 overflow-x-auto">
									<table className="w-full text-[11px]">
										<thead>
											<tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-left">
												<th className="px-2.5 py-2 font-semibold">Period</th>
												<th className="px-2 py-2 font-semibold text-center">Orders</th>
												<th className="px-2 py-2 font-semibold text-center">SO → DN</th>
												<th className="px-2 py-2 font-semibold text-center">SO → Invoice</th>
											</tr>
										</thead>
										<tbody>
											{['7d', '30d', '6m'].map((period, i) => {
												const row = getPeriodVal(analytics.turnaround, period)
												return (
													<tr key={period} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/50'}>
														<td className="px-2.5 py-2 font-semibold text-slate-800 dark:text-slate-200">{period === '6m' ? '6 months' : period === '30d' ? '30 days' : '7 days'}</td>
														<td className="px-2 py-2 text-center tabular-nums text-slate-500">{row?.order_count ?? '—'}</td>
														<td className={`px-2 py-2 text-center font-bold tabular-nums ${row?.avg_hrs_to_dn != null && row.avg_hrs_to_dn <= 48 ? 'text-emerald-600' : row?.avg_hrs_to_dn != null && row.avg_hrs_to_dn <= 120 ? 'text-amber-600' : 'text-red-600'}`}>
															{formatHrs(row?.avg_hrs_to_dn ?? null)}
														</td>
														<td className={`px-2 py-2 text-center font-bold tabular-nums ${row?.avg_hrs_to_si != null && row.avg_hrs_to_si <= 72 ? 'text-emerald-600' : row?.avg_hrs_to_si != null && row.avg_hrs_to_si <= 168 ? 'text-amber-600' : 'text-red-600'}`}>
															{formatHrs(row?.avg_hrs_to_si ?? null)}
														</td>
													</tr>
												)
											})}
										</tbody>
									</table>
								</div>
							</section>

							{/* Pending summary by status */}
							{analytics.pending_summary.length > 0 && (
								<section>
									<h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
										<FileText className="w-3.5 h-3.5 text-blue-500" />
										Pending Orders by Status
									</h3>
									<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
										{analytics.pending_summary.map(s => (
											<div key={s.status} className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 p-2.5">
												<p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">{s.status}</p>
												<p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">{s.cnt}</p>
												<p className="text-[9px] text-slate-400 tabular-nums">{formatCurrency(s.total_value)}</p>
											</div>
										))}
									</div>
								</section>
							)}

							{/* Nearly complete but still open */}
							{analytics.nearly_complete.length > 0 && (
								<section>
									<h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
										<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
										Nearly Complete but Still Open (&gt;80% delivered &amp; billed)
									</h3>
									<div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 overflow-x-auto">
										<table className="w-full text-[11px]">
											<thead>
												<tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-left">
													<th className="px-2.5 py-2 font-semibold">Order</th>
													<th className="px-2 py-2 font-semibold">Customer</th>
													<th className="px-2 py-2 font-semibold text-center">Del %</th>
													<th className="px-2 py-2 font-semibold text-center">Bill %</th>
													<th className="px-2 py-2 font-semibold text-center">Days Open</th>
													<th className="px-2 py-2 font-semibold text-right">Value</th>
												</tr>
											</thead>
											<tbody>
												{analytics.nearly_complete.slice(0, 20).map((nc, i) => (
													<tr key={nc.name} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/50'}>
														<td className="px-2.5 py-1.5 font-mono text-[10px] text-slate-700 dark:text-slate-300">{nc.name}</td>
														<td className="px-2 py-1.5 text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{nc.customer_name}</td>
														<td className={`px-2 py-1.5 text-center font-bold tabular-nums ${nc.per_delivered >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>{nc.per_delivered.toFixed(0)}%</td>
														<td className={`px-2 py-1.5 text-center font-bold tabular-nums ${nc.per_billed >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>{nc.per_billed.toFixed(0)}%</td>
														<td className={`px-2 py-1.5 text-center tabular-nums ${nc.days_open > 30 ? 'text-red-600 font-bold' : 'text-slate-500'}`}>{nc.days_open}d</td>
														<td className="px-2 py-1.5 text-right tabular-nums text-slate-500">{formatCurrency(nc.grand_total)}</td>
													</tr>
												))}
											</tbody>
										</table>
										{analytics.nearly_complete.length > 20 && (
											<p className="px-3 py-1.5 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
												+{analytics.nearly_complete.length - 20} more
											</p>
										)}
									</div>
								</section>
							)}

							{/* Modifications & Amendments */}
							<section>
								<h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
									<Edit3 className="w-3.5 h-3.5 text-violet-500" />
									Order Modifications &amp; Amendments
								</h3>
								<div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 overflow-x-auto">
									<table className="w-full text-[11px]">
										<thead>
											<tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-left">
												<th className="px-2.5 py-2 font-semibold">Period</th>
												<th className="px-2 py-2 font-semibold text-center">Orders Modified</th>
												<th className="px-2 py-2 font-semibold text-center">Total Edits</th>
												<th className="px-2 py-2 font-semibold text-center">Amended (New Version)</th>
											</tr>
										</thead>
										<tbody>
											{['7d', '30d', '6m'].map((period, i) => {
												const mod = getPeriodVal(analytics.modifications, period)
												const amend = getPeriodVal(analytics.amendments, period)
												return (
													<tr key={period} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/50'}>
														<td className="px-2.5 py-2 font-semibold text-slate-800 dark:text-slate-200">{period === '6m' ? '6 months' : period === '30d' ? '30 days' : '7 days'}</td>
														<td className="px-2 py-2 text-center tabular-nums font-bold text-violet-600">{mod?.orders_modified ?? 0}</td>
														<td className="px-2 py-2 text-center tabular-nums text-slate-500">{mod?.total_changes ?? 0}</td>
														<td className="px-2 py-2 text-center tabular-nums text-amber-600 font-bold">{amend?.cnt ?? 0}</td>
													</tr>
												)
											})}
										</tbody>
									</table>
								</div>
							</section>

							{/* Top 10 Cities + Top 10 Customers side by side */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
								{/* Top Cities */}
								<section>
									<h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
										<MapPin className="w-3.5 h-3.5 text-emerald-500" />
										Top 10 Cities (6 months)
									</h3>
									<div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 overflow-x-auto">
										<table className="w-full text-[11px]">
											<thead>
												<tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-left">
													<th className="px-2.5 py-2 font-semibold">City</th>
													<th className="px-2 py-2 font-semibold text-center">6m</th>
													<th className="px-2 py-2 font-semibold text-center">30d</th>
													<th className="px-2 py-2 font-semibold text-center">7d</th>
													<th className="px-2 py-2 font-semibold text-right">Value</th>
												</tr>
											</thead>
											<tbody>
												{analytics.top_cities.map((c, i) => (
													<tr key={c.city} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/50'}>
														<td className="px-2.5 py-1.5 font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{c.city}</td>
														<td className="px-2 py-1.5 text-center tabular-nums font-bold text-slate-700 dark:text-slate-300">{c.order_count}</td>
														<td className="px-2 py-1.5 text-center tabular-nums text-slate-500">{c.count_30d}</td>
														<td className="px-2 py-1.5 text-center tabular-nums text-slate-500">{c.count_7d}</td>
														<td className="px-2 py-1.5 text-right tabular-nums text-emerald-600 font-bold">{formatCurrency(c.total_value)}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</section>

								{/* Top Customers */}
								<section>
									<h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
										<Users className="w-3.5 h-3.5 text-blue-500" />
										Top 10 Parties (6 months)
									</h3>
									<div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 overflow-x-auto">
										<table className="w-full text-[11px]">
											<thead>
												<tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-left">
													<th className="px-2.5 py-2 font-semibold">Customer</th>
													<th className="px-2 py-2 font-semibold text-center">6m</th>
													<th className="px-2 py-2 font-semibold text-center">30d</th>
													<th className="px-2 py-2 font-semibold text-center">7d</th>
													<th className="px-2 py-2 font-semibold text-right">Value</th>
												</tr>
											</thead>
											<tbody>
												{analytics.top_customers.map((c, i) => (
													<tr key={c.customer_name} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/50'}>
														<td className="px-2.5 py-1.5 font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]" title={c.customer_name}>{c.customer_name}</td>
														<td className="px-2 py-1.5 text-center tabular-nums font-bold text-slate-700 dark:text-slate-300">{c.order_count}</td>
														<td className="px-2 py-1.5 text-center tabular-nums text-slate-500">{c.count_30d}</td>
														<td className="px-2 py-1.5 text-center tabular-nums text-slate-500">{c.count_7d}</td>
														<td className="px-2 py-1.5 text-right tabular-nums text-blue-600 font-bold">{formatCurrency(c.total_value)}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</section>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	)
}

function Card({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color?: string }) {
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
