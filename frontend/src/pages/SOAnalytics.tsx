import { useMemo } from 'react'
import { useFrappeGetCall } from 'frappe-react-sdk'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Clock, AlertTriangle, MapPin, Users, Edit3, FileText, TrendingUp, BarChart3, PackageX, Star } from 'lucide-react'
import { API } from '@/lib/api'
import { useSelectedProfile } from '@/hooks/useProfile'

interface TurnaroundRow { period: string; order_count: number; avg_hrs_to_dn: number | null; avg_hrs_to_si: number | null; avg_hrs_dn_to_si: number | null }
interface NearlyComplete { name: string; customer_name: string; grand_total: number; per_delivered: number; per_billed: number; status: string; transaction_date: string | null; days_open: number }
interface PendingSummary { status: string; cnt: number; total_value: number }
interface ModRow { period: string; orders_modified: number; total_changes: number }
interface AmendRow { period: string; cnt: number }
interface CityRow { city: string; order_count: number; total_value: number; count_7d: number; count_30d: number }
interface CustomerRow { customer_name: string; order_count: number; total_value: number; count_7d: number; count_30d: number }
interface UnfulfillmentRow { period: string; total_lines: number; unfulfilled_lines: number; unfulfilled_pct: number }
interface TopSku { item_code: string; item_name: string; total_qty: number; stock_uom: string; order_count: number; qty_7d: number; qty_14d: number; qty_30d: number }

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
	unfulfillment: UnfulfillmentRow[]
	top_skus: TopSku[]
}

function formatHrs(h: number | null): string {
	if (h == null) return '—'
	if (h < 1) return `${Math.round(h * 60)}m`
	if (h < 24) return `${h.toFixed(1)}h`
	const d = h / 24
	return d < 10 ? `${d.toFixed(1)}d` : `${Math.round(d)}d`
}


function fmtQty(n: number): string {
	if (n >= 100000) return `${(n / 1000).toFixed(0)}K`
	if (n >= 1000) return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
	if (Number.isInteger(n)) return String(n)
	return n.toFixed(1)
}

function getPeriodVal<T extends { period: string }>(rows: T[], period: string): T | undefined {
	return rows.find(r => r.period === period)
}

const STATUS_LABELS: Record<string, string> = {
	'To Deliver and Bill': 'Needs Delivery + Invoice',
	'To Bill': 'Delivered, Needs Invoice',
	'To Deliver': 'Needs Delivery',
	'On Hold': 'On Hold',
	'Overdue': 'Overdue',
}

const STATUS_COLORS: Record<string, string> = {
	'To Deliver and Bill': 'border-l-red-500',
	'To Bill': 'border-l-amber-500',
	'To Deliver': 'border-l-blue-500',
	'On Hold': 'border-l-slate-400',
}

const PERIOD_LABELS: Record<string, string> = { '7d': 'Last 7 days', '14d': 'Last 14 days', '30d': 'Last 30 days', '6m': 'Last 6 months' }

function timeColor(hrs: number | null, greenMax: number, amberMax: number): string {
	if (hrs == null) return 'text-slate-400'
	if (hrs <= greenMax) return 'text-emerald-600 dark:text-emerald-400'
	if (hrs <= amberMax) return 'text-amber-600 dark:text-amber-400'
	return 'text-red-600 dark:text-red-400'
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
	const a = data?.message

	const totalPending = useMemo(() => {
		if (!a?.pending_summary) return { count: 0, value: 0 }
		return {
			count: a.pending_summary.reduce((s, r) => s + r.cnt, 0),
			value: a.pending_summary.reduce((s, r) => s + r.total_value, 0),
		}
	}, [a?.pending_summary])

	const turnaround30d = getPeriodVal(a?.turnaround ?? [], '30d')

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
						</p>
					</div>
					<button onClick={() => navigate('/analytics')} className="text-[10px] font-bold text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded px-2 py-1 transition-colors cursor-pointer touch-manipulation">
						Warehouse
					</button>
				</div>
			</header>

			<div className="flex-1 overflow-y-auto overscroll-contain">
				<div className="max-w-6xl mx-auto p-3 space-y-4">

					{!profileName && (
						<div className="flex flex-col items-center py-20 text-center">
							<ShoppingCart className="w-8 h-8 text-slate-300 mb-3" />
							<p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No profile selected</p>
							<p className="text-xs text-slate-500">Go back and select a POW profile</p>
						</div>
					)}

					{profileName && isLoading && (
						<div className="flex items-center justify-center py-20">
							<div className="animate-pulse text-sm text-slate-500">Loading...</div>
						</div>
					)}

					{profileName && !isLoading && a && (
						<>
							{/* ─── At-a-glance summary ─── */}
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
								<MetricCard
									label="Open Orders"
									value={totalPending.count}
									sub="pending fulfillment"
									icon={<FileText className="w-4 h-4 text-cyan-500" />}
								/>
								<MetricCard
									label="Avg to Deliver"
									value={formatHrs(turnaround30d?.avg_hrs_to_dn ?? null)}
									sub="last 30 days"
									icon={<Clock className="w-4 h-4 text-emerald-500" />}
									valueColor={timeColor(turnaround30d?.avg_hrs_to_dn ?? null, 48, 120)}
								/>
								<MetricCard
									label="Suggest Close"
									value={a.nearly_complete_count}
									sub=">80% done & >14d old"
									icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
									valueColor={a.nearly_complete_count > 0 ? 'text-amber-600' : 'text-emerald-600'}
								/>
								<MetricCard
									label="Can Be Closed"
									value={a.ignore_count}
									sub=">95% delivered"
									icon={<TrendingUp className="w-4 h-4 text-red-500" />}
									valueColor={a.ignore_count > 0 ? 'text-red-600' : 'text-slate-400'}
								/>
							</div>

							{/* ─── Pending breakdown ─── */}
							{a.pending_summary.length > 0 && (
								<section>
									<SectionHeader icon={<FileText className="w-3.5 h-3.5 text-blue-500" />} title="Open Orders by Status" />
									<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
										{a.pending_summary.map(s => (
											<div key={s.status} className={`bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 border-l-4 ${STATUS_COLORS[s.status] ?? 'border-l-slate-300'} p-3 flex items-center gap-3`}>
												<p className="flex-1 text-xs font-semibold text-slate-800 dark:text-slate-200">{STATUS_LABELS[s.status] ?? s.status}</p>
												<p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100 shrink-0">{s.cnt}</p>
											</div>
										))}
									</div>
								</section>
							)}

							{/* ─── Turnaround ─── */}
							<section>
								<SectionHeader icon={<Clock className="w-3.5 h-3.5 text-cyan-500" />} title="Order Turnaround Time" />
								<div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
									{['7d', '30d', '6m'].map((period, i) => {
										const row = getPeriodVal(a.turnaround, period)
										return (
											<div key={period} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}>
												<div className="w-24 shrink-0">
													<p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{PERIOD_LABELS[period]}</p>
													<p className="text-[9px] text-slate-400 tabular-nums">{row?.order_count ?? 0} orders</p>
												</div>
												<div className="flex-1 grid grid-cols-3 gap-2">
													<div className="text-center">
														<p className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5">Order → DN</p>
														<p className={`text-sm font-bold tabular-nums ${timeColor(row?.avg_hrs_to_dn ?? null, 48, 120)}`}>
															{formatHrs(row?.avg_hrs_to_dn ?? null)}
														</p>
													</div>
													<div className="text-center">
														<p className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5">DN → Invoice</p>
														<p className={`text-sm font-bold tabular-nums ${timeColor(row?.avg_hrs_dn_to_si ?? null, 24, 72)}`}>
															{formatHrs(row?.avg_hrs_dn_to_si ?? null)}
														</p>
													</div>
													<div className="text-center">
														<p className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5">Order → Invoice</p>
														<p className={`text-sm font-bold tabular-nums ${timeColor(row?.avg_hrs_to_si ?? null, 72, 168)}`}>
															{formatHrs(row?.avg_hrs_to_si ?? null)}
														</p>
													</div>
												</div>
											</div>
										)
									})}
								</div>
							</section>

							{/* ─── Nearly complete ─── */}
							{a.nearly_complete.length > 0 && (
								<section>
									<SectionHeader icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />} title={`${a.nearly_complete_count} Orders to Close (>80% done, >14 days old)`} />
									<div className="space-y-1.5">
										{a.nearly_complete.slice(0, 15).map(nc => (
											<div key={nc.name} className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center gap-2">
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2">
														<span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">{nc.name}</span>
														<span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">{nc.customer_name}</span>
													</div>
													<p className={`text-[9px] font-bold mt-0.5 ${nc.days_open > 30 ? 'text-red-500' : 'text-slate-400'}`}>
													{nc.days_open} days old
												</p>
												</div>
												<div className="flex items-center gap-1.5 shrink-0">
													<ProgressPill label="Del" pct={nc.per_delivered} />
													<ProgressPill label="Bill" pct={nc.per_billed} />
												</div>
											</div>
										))}
										{a.nearly_complete.length > 15 && (
											<p className="text-[10px] text-slate-400 text-center py-1">
												+{a.nearly_complete.length - 15} more orders
											</p>
										)}
									</div>
								</section>
							)}

							{/* ─── Modifications ─── */}
							<section>
								<SectionHeader icon={<Edit3 className="w-3.5 h-3.5 text-violet-500" />} title="Order Changes" />
								<div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
									{['7d', '30d', '6m'].map((period, i) => {
										const mod = getPeriodVal(a.modifications, period)
										const amend = getPeriodVal(a.amendments, period)
										return (
											<div key={period} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}>
												<p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 w-24 shrink-0">{PERIOD_LABELS[period]}</p>
												<div className="flex-1 grid grid-cols-3 gap-2 text-center">
													<div>
														<p className="text-[8px] text-slate-400 uppercase tracking-wider">Edited</p>
														<p className="text-sm font-bold tabular-nums text-violet-600">{mod?.orders_modified ?? 0}</p>
													</div>
													<div>
														<p className="text-[8px] text-slate-400 uppercase tracking-wider">Total Edits</p>
														<p className="text-sm font-bold tabular-nums text-slate-600 dark:text-slate-300">{mod?.total_changes ?? 0}</p>
													</div>
													<div>
														<p className="text-[8px] text-slate-400 uppercase tracking-wider">Amended</p>
														<p className="text-sm font-bold tabular-nums text-amber-600">{amend?.cnt ?? 0}</p>
													</div>
												</div>
											</div>
										)
									})}
								</div>
							</section>

							{/* ─── Item unfulfillment rate ─── */}
							{a.unfulfillment.length > 0 && (
								<section>
									<SectionHeader icon={<PackageX className="w-3.5 h-3.5 text-red-500" />} title="Item-Level Unfulfillment Rate" />
									<div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
										{['7d', '14d', '30d', '6m'].map((period, i) => {
											const row = getPeriodVal(a.unfulfillment, period)
											const pct = row?.unfulfilled_pct ?? 0
											const barColor = pct <= 5 ? 'bg-emerald-500' : pct <= 15 ? 'bg-amber-500' : 'bg-red-500'
											const textColor = pct <= 5 ? 'text-emerald-600' : pct <= 15 ? 'text-amber-600' : 'text-red-600'
											return (
												<div key={period} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}>
													<p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 w-24 shrink-0">{PERIOD_LABELS[period]}</p>
													<div className="flex-1">
														<div className="flex items-center gap-2">
															<div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
																<div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
															</div>
															<span className={`text-sm font-bold tabular-nums w-12 text-right ${textColor}`}>{pct}%</span>
														</div>
														<p className="text-[9px] text-slate-400 mt-0.5 tabular-nums">
															{row?.unfulfilled_lines ?? 0} of {row?.total_lines ?? 0} line items not fully delivered
														</p>
													</div>
												</div>
											)
										})}
									</div>
								</section>
							)}

							{/* ─── Top selling SKUs ─── */}
							{a.top_skus.length > 0 && (
								<section>
									<SectionHeader icon={<Star className="w-3.5 h-3.5 text-amber-500" />} title="Top Selling Items" />
									<div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 overflow-x-auto">
										<div className="flex items-center px-3 py-1.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
											<span className="w-5 shrink-0">#</span>
											<span className="flex-1">Item</span>
											<span className="w-14 text-right">7d</span>
											<span className="w-14 text-right">14d</span>
											<span className="w-14 text-right">30d</span>
											<span className="w-14 text-right">6m</span>
											<span className="w-12 text-right">Orders</span>
										</div>
										{a.top_skus.map((sku, i) => {
											const maxQty = a.top_skus[0]?.total_qty || 1
											return (
												<div key={sku.item_code} className={`flex items-center px-3 py-2 gap-1 ${i > 0 ? 'border-t border-slate-50 dark:border-slate-800/50' : ''}`}>
													<span className="text-[10px] font-bold text-slate-400 w-5 shrink-0 tabular-nums">{i + 1}</span>
													<div className="flex-1 min-w-0">
														<p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">{sku.item_name || sku.item_code}</p>
														<div className="flex items-center gap-1.5 mt-0.5">
															<span className="text-[9px] text-slate-400 font-mono">{sku.item_code}</span>
															<span className="text-[8px] text-slate-400">{sku.stock_uom}</span>
														</div>
														<div className="mt-0.5 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
															<div className="h-full rounded-full bg-amber-500" style={{ width: `${(sku.total_qty / maxQty) * 100}%` }} />
														</div>
													</div>
													<span className="w-14 text-right text-[10px] font-bold tabular-nums text-slate-700 dark:text-slate-300">{fmtQty(sku.qty_7d)}</span>
													<span className="w-14 text-right text-[10px] tabular-nums text-slate-500">{fmtQty(sku.qty_14d)}</span>
													<span className="w-14 text-right text-[10px] tabular-nums text-slate-500">{fmtQty(sku.qty_30d)}</span>
													<span className="w-14 text-right text-[10px] font-bold tabular-nums text-amber-600">{fmtQty(sku.total_qty)}</span>
													<span className="w-12 text-right text-[10px] tabular-nums text-slate-400">{sku.order_count}</span>
												</div>
											)
										})}
									</div>
								</section>
							)}

							{/* ─── Top cities + customers ─── */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
								<section>
									<SectionHeader icon={<MapPin className="w-3.5 h-3.5 text-emerald-500" />} title="Top Cities" />
									<RankTable
										rows={a.top_cities.map(c => ({ label: c.city, total: c.order_count, d30: c.count_30d, d7: c.count_7d }))}
										accentColor="text-emerald-600"
									/>
								</section>
								<section>
									<SectionHeader icon={<Users className="w-3.5 h-3.5 text-blue-500" />} title="Top Customers" />
									<RankTable
										rows={a.top_customers.map(c => ({ label: c.customer_name, total: c.order_count, d30: c.count_30d, d7: c.count_7d }))}
										accentColor="text-blue-600"
									/>
								</section>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	)
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
	return (
		<h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
			{icon} {title}
		</h3>
	)
}

function MetricCard({ label, value, sub, icon, valueColor }: { label: string; value: string | number; sub: string; icon: React.ReactNode; valueColor?: string }) {
	return (
		<div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
			<div className="flex items-center gap-1.5 mb-1.5">
				{icon}
				<span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">{label}</span>
			</div>
			<p className={`text-xl font-bold tabular-nums ${valueColor || 'text-slate-900 dark:text-slate-100'}`}>{value}</p>
			<p className="text-[9px] text-slate-400 mt-0.5">{sub}</p>
		</div>
	)
}

function ProgressPill({ label, pct }: { label: string; pct: number }) {
	const rounded = Math.round(pct)
	const color = rounded >= 95 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
		: rounded >= 80 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
		: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
	return (
		<span className={`text-[9px] font-bold rounded px-1.5 py-0.5 tabular-nums ${color}`}>
			{label} {rounded}%
		</span>
	)
}

interface RankRow { label: string; total: number; d30: number; d7: number }

function RankTable({ rows, accentColor }: { rows: RankRow[]; accentColor: string }) {
	const maxTotal = Math.max(...rows.map(r => r.total), 1)
	return (
		<div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
			<div className="flex items-center px-3 py-1.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
				<span className="flex-1">Name</span>
				<span className="w-12 text-center">6m</span>
				<span className="w-10 text-center">30d</span>
				<span className="w-10 text-center">7d</span>
			</div>
			{rows.map((r, i) => (
				<div key={r.label} className="flex items-center px-3 py-2 gap-1">
					<span className="text-[10px] font-bold text-slate-400 w-4 shrink-0 tabular-nums">{i + 1}</span>
					<div className="flex-1 min-w-0">
						<p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate" title={r.label}>{r.label}</p>
						<div className="mt-0.5 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
							<div className={`h-full rounded-full ${accentColor.replace('text-', 'bg-')}`} style={{ width: `${(r.total / maxTotal) * 100}%` }} />
						</div>
					</div>
					<span className={`w-12 text-center text-[11px] font-bold tabular-nums ${accentColor}`}>{r.total}</span>
					<span className="w-10 text-center text-[10px] tabular-nums text-slate-500">{r.d30}</span>
					<span className="w-10 text-center text-[10px] tabular-nums text-slate-500">{r.d7}</span>
				</div>
			))}
			{rows.length === 0 && (
				<div className="px-3 py-6 text-center text-xs text-slate-400">No data</div>
			)}
		</div>
	)
}
