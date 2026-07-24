import { useState, useMemo } from 'react'
import { useFrappeGetDocList } from 'frappe-react-sdk'
import { Search, Printer, RefreshCw, Calendar, ArrowRight, Package, X } from 'lucide-react'

interface TransactionListTabProps {
  doctype: string
  onPrintTransaction: (doctype: string, docname: string) => void
}

export default function TransactionListTab({ doctype, onPrintTransaction }: TransactionListTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'draft'>('submitted')

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

  // Build filters dynamically
  const filters: any[] = useMemo(() => {
    const list: any[] = []
    if (statusFilter === 'submitted') {
      list.push(['docstatus', '=', 1])
    } else if (statusFilter === 'draft') {
      list.push(['docstatus', '=', 0])
    }
    return list
  }, [statusFilter])

  const { data: docs, isLoading, mutate } = useFrappeGetDocList(doctype, {
    fields,
    filters,
    orderBy: { field: 'creation', order: 'desc' },
    limit: 100
  })

  // Universal Quick Search across all document columns & values
  const filteredDocs = useMemo(() => {
    if (!docs) return []
    if (!searchTerm.trim()) return docs

    const query = searchTerm.toLowerCase().trim()
    return docs.filter((doc: any) => {
      // Check document status text matching ('submitted', 'draft', 'cancelled')
      const statusText = doc.docstatus === 1 ? 'submitted' : doc.docstatus === 0 ? 'draft' : 'cancelled'
      if (statusText.includes(query)) return true

      // Universal check across all column values of the document row
      return Object.values(doc).some((val) => {
        if (val == null) return false
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val).toLowerCase().includes(query)
        }
        return false
      })
    })
  }, [docs, searchTerm])

  const getDocBadge = (status: number) => {
    if (status === 1) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">Submitted</span>
    }
    if (status === 0) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Draft</span>
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Cancelled</span>
  }

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Quick search across all columns (ID, Date, Purpose, Warehouse, Partner)...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mr-1">
            {filteredDocs.length} {filteredDocs.length === 1 ? 'doc' : 'docs'}
          </span>

          <button
            type="button"
            onClick={() => setStatusFilter('submitted')}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
              statusFilter === 'submitted'
                ? 'bg-indigo-600 text-white dark:bg-indigo-600'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Submitted
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white dark:bg-indigo-600'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => mutate()}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <p className="text-xs">Loading {doctype} transactions...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
              <Package className="w-8 h-8 opacity-40" />
              <p className="text-xs font-medium">No {doctype} documents found.</p>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-indigo-600 hover:underline font-semibold mt-1"
                >
                  Clear search filter
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider z-10">
                <tr>
                  <th className="py-2.5 px-3">Document ID</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">{doctype === 'Stock Entry' ? 'Purpose' : 'Partner'}</th>
                  <th className="py-2.5 px-3">Warehouse Details</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
                {filteredDocs.map((doc: any) => (
                  <tr key={doc.name} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors">
                    {/* Document ID */}
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {doc.name}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{doc.posting_date}</span>
                        {doc.posting_time && <span className="text-[10px] opacity-75">({doc.posting_time?.slice(0, 5)})</span>}
                      </div>
                    </td>

                    {/* Purpose or Partner */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {doctype === 'Stock Entry' ? (
                        <span className="font-medium text-slate-800 dark:text-slate-200">{doc.purpose || 'N/A'}</span>
                      ) : (
                        <span className="font-medium text-slate-800 dark:text-slate-200">{doc.supplier_name || doc.customer_name || 'N/A'}</span>
                      )}
                    </td>

                    {/* Warehouse Details */}
                    <td className="py-2.5 px-3">
                      {doctype === 'Stock Entry' ? (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="truncate max-w-[120px] font-mono text-slate-600 dark:text-slate-400" title={doc.from_warehouse || 'N/A'}>
                            {doc.from_warehouse ? doc.from_warehouse.split(' - ')[0] : '—'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[120px] font-mono font-medium text-indigo-600 dark:text-indigo-400" title={doc.to_warehouse || 'N/A'}>
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
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getDocBadge(doc.docstatus)}
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onPrintTransaction(doctype, doc.name)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-sm hover:shadow transition-all active:scale-95 touch-manipulation"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Label</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
