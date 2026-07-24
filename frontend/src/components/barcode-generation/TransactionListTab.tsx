import { useState, useMemo } from 'react'
import { useFrappeGetDocList } from 'frappe-react-sdk'
import { Search, Printer, RefreshCw, Calendar, ArrowRight, Package, X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'

interface TransactionListTabProps {
  doctype: string
  onPrintTransaction: (doctype: string, docname: string) => void
}

export default function TransactionListTab({ doctype, onPrintTransaction }: TransactionListTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'draft'>('submitted')

  // Per-column filter inputs (High-density filter row)
  const [colFilters, setColFilters] = useState({
    id: '',
    date: '',
    partner: '',
    warehouse: '',
    status: ''
  })

  // Pagination state (Default 100 entries, removable response limit)
  const [pageSize, setPageSize] = useState<number>(100)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Build field list dynamically depending on DocType
  const fields = useMemo(() => {
    switch (doctype) {
      case 'Stock Entry':
        return ['name', 'posting_date', 'posting_time', 'purpose', 'from_warehouse', 'to_warehouse', 'total_incoming_value', 'docstatus', 'modified']
      case 'Purchase Receipt':
        return ['name', 'posting_date', 'posting_time', 'supplier_name', 'set_warehouse', 'grand_total', 'docstatus', 'modified']
      case 'Delivery Note':
        return ['name', 'posting_date', 'posting_time', 'customer_name', 'set_warehouse', 'grand_total', 'docstatus', 'modified']
      default:
        return ['name', 'posting_date', 'posting_time', 'docstatus', 'modified']
    }
  }, [doctype])

  // Build Frappe filters dynamically including Date Range Filter
  const filters: any[] = useMemo(() => {
    const list: any[] = []
    if (statusFilter === 'submitted') {
      list.push(['docstatus', '=', 1])
    } else if (statusFilter === 'draft') {
      list.push(['docstatus', '=', 0])
    }

    if (fromDate) {
      list.push(['posting_date', '>=', fromDate])
    }
    if (toDate) {
      list.push(['posting_date', '<=', toDate])
    }

    return list
  }, [statusFilter, fromDate, toDate])

  // Fetch ALL entries without response count limit (limit: 0 in Frappe API returns all matching records)
  const { data: docs, isLoading, mutate } = useFrappeGetDocList(doctype, {
    fields,
    filters,
    orderBy: { field: 'creation', order: 'desc' },
    limit: 0
  })

  // Universal Quick Search + Column Filters
  const filteredDocs = useMemo(() => {
    if (!docs) return []

    return docs.filter((doc: any) => {
      // 1. Global Search Filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const statusText = doc.docstatus === 1 ? 'submitted' : doc.docstatus === 0 ? 'draft' : 'cancelled'
        
        const matchesGlobal = statusText.includes(query) || Object.values(doc).some((val) => {
          if (val == null) return false
          if (typeof val === 'string' || typeof val === 'number') {
            return String(val).toLowerCase().includes(query)
          }
          return false
        })

        if (!matchesGlobal) return false
      }

      // 2. Per-Column Search Filters
      if (colFilters.id.trim() && !doc.name?.toLowerCase().includes(colFilters.id.toLowerCase().trim())) {
        return false
      }

      if (colFilters.date.trim() && !doc.posting_date?.toLowerCase().includes(colFilters.date.toLowerCase().trim())) {
        return false
      }

      if (colFilters.partner.trim()) {
        const pQuery = colFilters.partner.toLowerCase().trim()
        const partnerStr = (doc.purpose || doc.supplier_name || doc.customer_name || '').toLowerCase()
        if (!partnerStr.includes(pQuery)) return false
      }

      if (colFilters.warehouse.trim()) {
        const wQuery = colFilters.warehouse.toLowerCase().trim()
        const whStr = (doc.from_warehouse || doc.to_warehouse || doc.set_warehouse || '').toLowerCase()
        if (!whStr.includes(wQuery)) return false
      }

      if (colFilters.status.trim()) {
        const sQuery = colFilters.status.toLowerCase().trim()
        const sText = doc.docstatus === 1 ? 'submitted' : doc.docstatus === 0 ? 'draft' : 'cancelled'
        if (!sText.includes(sQuery)) return false
      }

      return true
    })
  }, [docs, searchTerm, colFilters])

  // Pagination calculation
  const totalRecords = filteredDocs.length
  const effectivePageSize = pageSize === 0 ? Math.max(1, totalRecords) : pageSize
  const totalPages = Math.max(1, Math.ceil(totalRecords / effectivePageSize))

  const validCurrentPage = useMemo(() => {
    return Math.min(currentPage, totalPages)
  }, [currentPage, totalPages])

  const paginatedDocs = useMemo(() => {
    if (pageSize === 0) return filteredDocs
    const startIdx = (validCurrentPage - 1) * pageSize
    return filteredDocs.slice(startIdx, startIdx + pageSize)
  }, [filteredDocs, validCurrentPage, pageSize])

  const getDocBadge = (status: number) => {
    if (status === 1) {
      return <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">Submitted</span>
    }
    if (status === 0) {
      return <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Draft</span>
    }
    return <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Cancelled</span>
  }

  const getDocSlug = (dt: string) => {
    return dt.toLowerCase().replace(/\s+/g, '-')
  }

  return (
    <div className="flex flex-col h-full space-y-1.5">
      
      {/* Consolidated Tight Single-Line Search & Filter Toolbar */}
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 shadow-xs shrink-0 text-xs">
        
        {/* Global Search Input */}
        <div className="relative flex-1 max-w-sm min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Global search across all columns...`}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            className="w-full pl-7 pr-7 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setCurrentPage(1) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Date Range & Controls Toolbar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          
          {/* Date Range Pickers */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5">
            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-[10px] text-slate-400 font-bold uppercase">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1) }}
                className="bg-transparent text-[11px] text-slate-900 dark:text-white focus:outline-none p-0"
              />
              <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setCurrentPage(1) }}
                className="bg-transparent text-[11px] text-slate-900 dark:text-white focus:outline-none p-0"
              />
              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={() => { setFromDate(''); setToDate(''); setCurrentPage(1) }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 ml-0.5"
                  title="Clear dates"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded">
            <button
              type="button"
              onClick={() => { setStatusFilter('submitted'); setCurrentPage(1) }}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors ${
                statusFilter === 'submitted'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Submitted
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('all'); setCurrentPage(1) }}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
          </div>

          {/* Result Count Badge */}
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded shrink-0">
            {filteredDocs.length} {filteredDocs.length === 1 ? 'doc' : 'docs'}
          </span>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => mutate()}
            className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* High-Density Data Grid Container */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-xs flex flex-col">
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
              <p className="text-xs font-medium">Loading {doctype} transactions...</p>
            </div>
          ) : paginatedDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
              <Package className="w-7 h-7 opacity-40" />
              <p className="text-xs font-medium">No {doctype} documents match your filters.</p>
              {(searchTerm || fromDate || toDate || colFilters.id || colFilters.date || colFilters.partner || colFilters.warehouse || colFilters.status) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setFromDate('')
                    setToDate('')
                    setColFilters({ id: '', date: '', partner: '', warehouse: '', status: '' })
                    setCurrentPage(1)
                  }}
                  className="text-xs text-indigo-600 hover:underline font-semibold mt-1"
                >
                  Reset all filters
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              {/* Table Header */}
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider z-10">
                <tr>
                  <th className="py-1.5 px-2.5">Document ID</th>
                  <th className="py-1.5 px-2.5">Date</th>
                  <th className="py-1.5 px-2.5">{doctype === 'Stock Entry' ? 'Purpose' : 'Partner'}</th>
                  <th className="py-1.5 px-2.5">Warehouse Details</th>
                  <th className="py-1.5 px-2.5">Status</th>
                  <th className="py-1.5 px-2.5 text-right w-20">Action</th>
                </tr>

                {/* Per-Column Quick Search Input Row */}
                <tr className="bg-slate-50/90 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                  <td className="py-1 px-2">
                    <input
                      type="text"
                      placeholder="Filter ID..."
                      value={colFilters.id}
                      onChange={e => { setColFilters(prev => ({ ...prev, id: e.target.value })); setCurrentPage(1) }}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 text-[11px] font-normal text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="py-1 px-2">
                    <input
                      type="text"
                      placeholder="Filter Date..."
                      value={colFilters.date}
                      onChange={e => { setColFilters(prev => ({ ...prev, date: e.target.value })); setCurrentPage(1) }}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 text-[11px] font-normal text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="py-1 px-2">
                    <input
                      type="text"
                      placeholder="Filter Partner/Purpose..."
                      value={colFilters.partner}
                      onChange={e => { setColFilters(prev => ({ ...prev, partner: e.target.value })); setCurrentPage(1) }}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 text-[11px] font-normal text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="py-1 px-2">
                    <input
                      type="text"
                      placeholder="Filter Warehouse..."
                      value={colFilters.warehouse}
                      onChange={e => { setColFilters(prev => ({ ...prev, warehouse: e.target.value })); setCurrentPage(1) }}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 text-[11px] font-normal text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="py-1 px-2">
                    <input
                      type="text"
                      placeholder="Filter Status..."
                      value={colFilters.status}
                      onChange={e => { setColFilters(prev => ({ ...prev, status: e.target.value })); setCurrentPage(1) }}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 text-[11px] font-normal text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="py-1 px-2 text-right">
                    {(colFilters.id || colFilters.date || colFilters.partner || colFilters.warehouse || colFilters.status) && (
                      <button
                        type="button"
                        onClick={() => { setColFilters({ id: '', date: '', partner: '', warehouse: '', status: '' }); setCurrentPage(1) }}
                        className="text-[10px] text-red-500 hover:underline font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </td>
                </tr>
              </thead>

              {/* Table Data Rows */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {paginatedDocs.map((doc: any) => (
                  <tr key={doc.name} className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 transition-colors">
                    
                    {/* Document ID Link */}
                    <td className="py-1.5 px-2.5 font-bold whitespace-nowrap">
                      <a
                        href={`/app/${getDocSlug(doctype)}/${doc.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold hover:underline inline-flex items-center gap-1 group"
                        title={`Open ${doctype} ${doc.name} in ERPNext`}
                      >
                        <span>{doc.name}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </td>

                    {/* Date */}
                    <td className="py-1.5 px-2.5 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                      <div className="flex items-center gap-1">
                        <span>{doc.posting_date}</span>
                        {doc.posting_time && <span className="text-[10px] opacity-75">({doc.posting_time?.slice(0, 5)})</span>}
                      </div>
                    </td>

                    {/* Purpose or Partner */}
                    <td className="py-1.5 px-2.5 whitespace-nowrap">
                      {doctype === 'Stock Entry' ? (
                        <span className="font-medium text-slate-800 dark:text-slate-200">{doc.purpose || 'N/A'}</span>
                      ) : (
                        <span className="font-medium text-slate-800 dark:text-slate-200">{doc.supplier_name || doc.customer_name || 'N/A'}</span>
                      )}
                    </td>

                    {/* Warehouse Details */}
                    <td className="py-1.5 px-2.5">
                      {doctype === 'Stock Entry' ? (
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="truncate max-w-[130px] font-mono text-slate-600 dark:text-slate-400" title={doc.from_warehouse || 'N/A'}>
                            {doc.from_warehouse ? doc.from_warehouse.split(' - ')[0] : '—'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px] font-mono font-medium text-indigo-600 dark:text-indigo-400" title={doc.to_warehouse || 'N/A'}>
                            {doc.to_warehouse ? doc.to_warehouse.split(' - ')[0] : '—'}
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {doc.set_warehouse ? doc.set_warehouse.split(' - ')[0] : '—'}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-1.5 px-2.5 whitespace-nowrap">
                      {getDocBadge(doc.docstatus)}
                    </td>

                    {/* Simplified Action Button (Compact Icon Button with Tooltip) */}
                    <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onPrintTransaction(doctype, doc.name)}
                        className="inline-flex items-center justify-center p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white rounded border border-indigo-200 dark:border-indigo-800 transition-colors shadow-2xs active:scale-95 touch-manipulation"
                        title={`Print Labels for ${doc.name}`}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="sr-only">Print</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* High-Density Footer Pagination Bar */}
        {!isLoading && totalRecords > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0 text-xs text-slate-600 dark:text-slate-400">
            <div>
              Showing <span className="font-semibold text-slate-900 dark:text-white">{(validCurrentPage - 1) * (pageSize || totalRecords) + 1}</span> to{' '}
              <span className="font-semibold text-slate-900 dark:text-white">{pageSize === 0 ? totalRecords : Math.min(validCurrentPage * pageSize, totalRecords)}</span> of{' '}
              <span className="font-semibold text-slate-900 dark:text-white">{totalRecords}</span> entries
            </div>

            <div className="flex items-center gap-3">
              {/* Rows Per Page Selector */}
              <div className="flex items-center gap-1 text-[11px]">
                <span className="font-medium text-slate-500">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(parseInt(e.target.value, 10)); setCurrentPage(1) }}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value={0}>All ({totalRecords})</option>
                </select>
              </div>

              {/* Page Controls */}
              {pageSize > 0 && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={validCurrentPage === 1}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    Page {validCurrentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={validCurrentPage >= totalPages}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
