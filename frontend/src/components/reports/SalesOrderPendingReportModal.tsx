import { useState, useEffect, useRef } from 'react'
import { useFrappePostCall } from 'frappe-react-sdk'
import { ArrowLeft, Loader2, RefreshCw, Table2, Layers, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { API, unwrap } from '@/lib/api'
import type { SOPendingLineRow, SOPendingSummaryRow, SOPendingPaginated } from '@/types'
import { SoReportCustomerPicker, SoReportItemPicker } from '@/components/reports/SoReportAsyncPickers'

type TabId = 'lines' | 'summary'

const EMPTY_FILTERS = { customer: '', sales_order: '', item_code: '' }

const PAGE_OPTIONS = [50, 125, 250] as const

const tabBtn = (active: boolean) =>
  `flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
    active
      ? 'bg-blue-600 text-white'
      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
  }`

const inputClass =
  'w-full min-w-0 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white text-xs px-2 py-1.5 focus:outline-none focus:border-blue-500'

function isPaginatedLines(x: unknown): x is SOPendingPaginated<SOPendingLineRow> {
  return (
    x !== null &&
    typeof x === 'object' &&
    'rows' in x &&
    'total' in x &&
    Array.isArray((x as SOPendingPaginated<SOPendingLineRow>).rows)
  )
}

function isPaginatedSummary(x: unknown): x is SOPendingPaginated<SOPendingSummaryRow> {
  return (
    x !== null &&
    typeof x === 'object' &&
    'rows' in x &&
    'total' in x &&
    Array.isArray((x as SOPendingPaginated<SOPendingSummaryRow>).rows)
  )
}

export default function SalesOrderPendingReportModal({
  open,
  onClose,
  powProfileName,
}: {
  open: boolean
  onClose: () => void
  powProfileName: string
}) {
  const [tab, setTab] = useState<TabId>('lines')
  const [lines, setLines] = useState<SOPendingLineRow[]>([])
  const [linesTotal, setLinesTotal] = useState(0)
  const [summary, setSummary] = useState<SOPendingSummaryRow[]>([])
  const [summaryTotal, setSummaryTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [pageStart, setPageStart] = useState(0)
  const [pageLength, setPageLength] = useState<number>(125)

  const { call: fetchLines } = useFrappePostCall(API.getSOPendingLines)
  const { call: fetchSummary } = useFrappePostCall(API.getSOPendingSummary)
  const fetchLinesRef = useRef(fetchLines)
  const fetchSummaryRef = useRef(fetchSummary)
  fetchLinesRef.current = fetchLines
  fetchSummaryRef.current = fetchSummary

  const prevOpen = useRef(false)
  useEffect(() => {
    if (open && !prevOpen.current) {
      setTab('lines')
      setDraftFilters(EMPTY_FILTERS)
      setAppliedFilters(EMPTY_FILTERS)
      setReloadNonce(0)
      setPageStart(0)
      setPageLength(125)
      setLines([])
      setLinesTotal(0)
      setSummary([])
      setSummaryTotal(0)
    }
    prevOpen.current = open
  }, [open])

  const appliedSig = `${appliedFilters.customer}\u0001${appliedFilters.sales_order}\u0001${appliedFilters.item_code}`
  const pageSig = `${pageStart}\u0001${pageLength}`

  useEffect(() => {
    if (!open || !powProfileName) return

    let cancelled = false
    setLoading(true)

    const payload = {
      pow_profile: powProfileName,
      start: pageStart,
      page_length: pageLength,
      ...(appliedFilters.customer.trim() ? { customer: appliedFilters.customer.trim() } : {}),
      ...(appliedFilters.sales_order.trim() ? { sales_order: appliedFilters.sales_order.trim() } : {}),
      ...(appliedFilters.item_code.trim() ? { item_code: appliedFilters.item_code.trim() } : {}),
    }

    ;(async () => {
      try {
        if (tab === 'lines') {
          const raw = unwrap(await fetchLinesRef.current(payload))
          if (cancelled) return
          if (isPaginatedLines(raw)) {
            if (raw.total > 0 && pageStart >= raw.total) {
              setPageStart(0)
              return
            }
            setLines(raw.rows)
            setLinesTotal(raw.total)
          } else if (Array.isArray(raw)) {
            setLines(raw as SOPendingLineRow[])
            setLinesTotal((raw as SOPendingLineRow[]).length)
          } else {
            setLines([])
            setLinesTotal(0)
          }
        } else {
          const raw = unwrap(await fetchSummaryRef.current(payload))
          if (cancelled) return
          if (isPaginatedSummary(raw)) {
            if (raw.total > 0 && pageStart >= raw.total) {
              setPageStart(0)
              return
            }
            setSummary(raw.rows)
            setSummaryTotal(raw.total)
          } else if (Array.isArray(raw)) {
            setSummary(raw as SOPendingSummaryRow[])
            setSummaryTotal((raw as SOPendingSummaryRow[]).length)
          } else {
            setSummary([])
            setSummaryTotal(0)
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Failed to load report'
          toast.error(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, powProfileName, tab, appliedSig, reloadNonce, pageSig])

  const applyFilters = () => {
    setPageStart(0)
    setAppliedFilters({ ...draftFilters })
  }

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    setPageStart(0)
  }

  const refresh = () => {
    setReloadNonce(n => n + 1)
  }

  const setTabResetPage = (t: TabId) => {
    setPageStart(0)
    setTab(t)
  }

  const changePageLength = (n: number) => {
    setPageLength(n)
    setPageStart(0)
  }

  const total = tab === 'lines' ? linesTotal : summaryTotal
  const rows = tab === 'lines' ? lines : summary
  const rangeFrom = total === 0 ? 0 : pageStart + 1
  const rangeTo = total === 0 ? 0 : pageStart + rows.length
  const canPrev = pageStart > 0
  const canNext = pageStart + pageLength < total

  const goPrev = () => {
    setPageStart(s => Math.max(0, s - pageLength))
  }

  const goNext = () => {
    setPageStart(s => (s + pageLength < total ? s + pageLength : s))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Table2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">Sales order pending delivery</h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Paginated on server (max {PAGE_OPTIONS[PAGE_OPTIONS.length - 1]} rows per page) · less DOM = faster UI
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="p-2 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-4 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 shrink-0">
        <button type="button" className={tabBtn(tab === 'lines')} onClick={() => setTabResetPage('lines')}>
          <Layers className="w-3.5 h-3.5" />
          By order &amp; line
        </button>
        <button type="button" className={tabBtn(tab === 'summary')} onClick={() => setTabResetPage('summary')}>
          <Table2 className="w-3.5 h-3.5" />
          Item totals
        </button>
      </div>

      <form
        className="px-4 py-2 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 shrink-0"
        onSubmit={e => {
          e.preventDefault()
          applyFilters()
        }}
      >
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Filters · pick customer &amp; item (exact) · sales order partial match
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-end">
          <label className="flex-1 min-w-[160px]">
            <span className="block text-[10px] text-slate-500 mb-0.5">Customer</span>
            <SoReportCustomerPicker
              powProfileName={powProfileName}
              value={draftFilters.customer}
              onChange={customerId => setDraftFilters(f => ({ ...f, customer: customerId }))}
              disabled={loading}
              inputClassName={inputClass}
            />
          </label>
          <label className="flex-1 min-w-[120px]">
            <span className="block text-[10px] text-slate-500 mb-0.5">Sales Order</span>
            <input
              className={inputClass}
              placeholder="SO name…"
              value={draftFilters.sales_order}
              onChange={e => setDraftFilters(f => ({ ...f, sales_order: e.target.value }))}
            />
          </label>
          <label className="flex-1 min-w-[180px]">
            <span className="block text-[10px] text-slate-500 mb-0.5">Item</span>
            <SoReportItemPicker
              powProfileName={powProfileName}
              value={draftFilters.item_code}
              onChange={code => setDraftFilters(f => ({ ...f, item_code: code }))}
              disabled={loading}
              inputClassName={inputClass}
            />
          </label>
          <div className="flex gap-2 shrink-0">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-blue-600 hover:bg-blue-500 text-white cursor-pointer disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              Apply
            </button>
            <button
              type="button"
              onClick={clearFilters}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-bold rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      </form>

      <div className="flex-1 min-h-0 flex flex-col p-3 pt-2 gap-2 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 text-[11px] text-slate-600 dark:text-slate-300">
          <span className="tabular-nums font-semibold">
            {total === 0 ? 'No rows' : `Rows ${rangeFrom}–${rangeTo} of ${total.toLocaleString()}`}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5">
              <span className="text-slate-500">Page size</span>
              <select
                className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                value={pageLength}
                onChange={e => changePageLength(Number(e.target.value))}
                disabled={loading}
              >
                {PAGE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={goPrev}
                disabled={loading || !canPrev}
                className="p-1.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={loading || !canNext}
                className="p-1.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto relative rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          {loading && (
            <div className="absolute top-2 right-3 z-10 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading…
            </div>
          )}
          {tab === 'lines' ? (
            <div className="overflow-x-auto min-h-0">
              <table className="min-w-[1100px] w-full text-left text-[11px]">
                <thead className="sticky top-0 z-[1] bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 uppercase tracking-wide font-bold border-b border-slate-200 dark:border-slate-700 shadow-sm">
                  <tr>
                    <th className="px-2 py-2 whitespace-nowrap">SO</th>
                    <th className="px-2 py-2 whitespace-nowrap">Status</th>
                    <th className="px-2 py-2 whitespace-nowrap">Customer</th>
                    <th className="px-2 py-2 whitespace-nowrap">Item</th>
                    <th className="px-2 py-2 text-right whitespace-nowrap">Sale qty (line UOM)</th>
                    <th className="px-2 py-2 text-right whitespace-nowrap">Delivered (stock UOM)</th>
                    <th className="px-2 py-2 text-right whitespace-nowrap">Pending (stock UOM)</th>
                    <th className="px-2 py-2 whitespace-nowrap">Deliv. date</th>
                    <th className="px-2 py-2 whitespace-nowrap">SO date</th>
                    <th className="px-2 py-2 whitespace-nowrap">Created by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {lines.map((row, i) => (
                    <tr key={`${row.sales_order}-${row.item_code}-${pageStart + i}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className="px-2 py-1.5 font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">{row.sales_order}</td>
                      <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{row.order_status}</td>
                      <td className="px-2 py-1.5 max-w-[10rem] truncate" title={row.customer_name}>{row.customer_name}</td>
                      <td className="px-2 py-1.5 min-w-[8rem]">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">{row.item_name}</div>
                        <div className="font-mono text-slate-500 text-[10px]">{row.item_code}</div>
                      </td>
                      <td className="px-2 py-1.5 text-right align-top">
                        <div className="tabular-nums whitespace-nowrap text-slate-900 dark:text-white">
                          {row.sale_qty} {row.sale_uom}
                        </div>
                        {row.sale_uom &&
                          row.stock_uom &&
                          row.sale_uom !== row.stock_uom &&
                          row.conversion_factor != null &&
                          Number(row.conversion_factor) > 0 && (
                            <div className="text-[9px] text-slate-500 dark:text-slate-400 font-normal mt-0.5 leading-tight">
                              1 {row.sale_uom} = {Number(row.conversion_factor)} {row.stock_uom}
                            </div>
                          )}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">
                        {row.delivered_qty} {row.stock_uom}
                      </td>
                      <td className="px-2 py-1.5 text-right font-bold tabular-nums text-amber-700 dark:text-amber-400 whitespace-nowrap">
                        {row.pending_qty} {row.stock_uom}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{row.delivery_date ?? '—'}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{row.transaction_date ?? '—'}</td>
                      <td className="px-2 py-1.5 max-w-[7rem] truncate" title={row.created_by}>{row.created_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {lines.length === 0 && !loading && (
                <p className="p-6 text-center text-sm text-slate-500">No pending lines for this company and filters.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto min-h-0">
              <table className="min-w-[640px] w-full text-left text-[11px]">
                <thead className="sticky top-0 z-[1] bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 uppercase tracking-wide font-bold border-b border-slate-200 dark:border-slate-700 shadow-sm">
                  <tr>
                    <th className="px-2 py-2">Item group</th>
                    <th className="px-2 py-2">Item</th>
                    <th className="px-2 py-2 text-right">Total pending</th>
                    <th className="px-2 py-2">UOM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {summary.map((row, i) => (
                    <tr key={`${row.item_code}-${row.uom}-${pageStart + i}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300">{row.item_group || '—'}</td>
                      <td className="px-2 py-1.5 min-w-[10rem]">
                        <div className="font-semibold text-slate-900 dark:text-white">{row.item_name}</div>
                        <div className="font-mono text-slate-500 text-[10px]">{row.item_code}</div>
                      </td>
                      <td className="px-2 py-1.5 text-right font-bold tabular-nums text-amber-700 dark:text-amber-400">
                        {row.total_pending_qty}
                      </td>
                      <td className="px-2 py-1.5">{row.uom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {summary.length === 0 && !loading && (
                <p className="p-6 text-center text-sm text-slate-500">No pending quantities for this company and filters.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
