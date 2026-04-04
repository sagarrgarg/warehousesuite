import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'
import { useFrappePostCall } from 'frappe-react-sdk'
import { API, unwrap } from '@/lib/api'

export interface SoReportCustomerRow {
  name: string
  customer_name: string
}

export interface SoReportItemRow {
  item_code: string
  item_name: string
  stock_uom?: string
}

const dropdownShell =
  'rounded shadow-xl max-h-56 overflow-y-auto z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600'

const rowBtn =
  'w-full text-left px-2.5 py-1.5 flex items-start gap-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0 touch-manipulation transition-colors'

function useDebounced<T>(value: T, ms: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return d
}

interface SoReportCustomerPickerProps {
  powProfileName: string
  value: string
  onChange: (customerId: string) => void
  disabled?: boolean
  inputClassName: string
}

/** Searchable customer list (exact Customer `name` on filter apply). */
export function SoReportCustomerPicker({
  powProfileName,
  value,
  onChange,
  disabled,
  inputClassName,
}: SoReportCustomerPickerProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const [results, setResults] = useState<SoReportCustomerRow[]>([])
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const { call: searchCustomers } = useFrappePostCall(API.searchSOReportCustomers)
  const searchCustomersRef = useRef(searchCustomers)
  searchCustomersRef.current = searchCustomers
  const debouncedQ = useDebounced(query.trim(), 280)

  useEffect(() => {
    if (!value) setQuery('')
  }, [value])

  const updateRect = useCallback(() => {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect())
  }, [])

  useEffect(() => {
    if (!isOpen || !powProfileName) return
    updateRect()
    const onScroll = () => updateRect()
    window.addEventListener('resize', onScroll, { passive: true })
    return () => window.removeEventListener('resize', onScroll)
  }, [isOpen, updateRect, powProfileName])

  useEffect(() => {
    if (!powProfileName || !isOpen) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const raw = unwrap(
          await searchCustomersRef.current({
            pow_profile: powProfileName,
            txt: debouncedQ || undefined,
          }),
        )
        if (!cancelled && Array.isArray(raw)) setResults(raw as SoReportCustomerRow[])
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [debouncedQ, isOpen, powProfileName])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setHighlightIdx(-1)
  }, [results])

  const pick = useCallback(
    (row: SoReportCustomerRow) => {
      onChange(row.name)
      setQuery(`${row.customer_name} (${row.name})`)
      setIsOpen(false)
      inputRef.current?.blur()
    },
    [onChange],
  )

  const clear = () => {
    setQuery('')
    onChange('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && highlightIdx >= 0 && results[highlightIdx]) {
      e.preventDefault()
      pick(results[highlightIdx])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const dropdownContent =
    isOpen &&
    rect &&
    (results.length > 0 || loading) && (
      <div
        ref={listRef}
        style={{
          position: 'fixed',
          top: rect.bottom + 2,
          left: rect.left,
          width: rect.width,
        }}
        className={dropdownShell}
      >
        {loading && results.length === 0 && (
          <div className="px-3 py-2 text-[10px] text-slate-500 dark:text-slate-400">Loading…</div>
        )}
        {results.map((row, idx) => (
          <button
            key={row.name}
            type="button"
            className={`${rowBtn} ${
              idx === highlightIdx
                ? 'bg-blue-50 dark:bg-slate-700/80'
                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
            onMouseDown={e => e.preventDefault()}
            onClick={() => pick(row)}
            onMouseEnter={() => setHighlightIdx(idx)}
          >
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-slate-900 dark:text-white block truncate">
                {row.customer_name}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block truncate">{row.name}</span>
            </div>
          </button>
        ))}
      </div>
    )

  const noResults =
    isOpen &&
    rect &&
    !loading &&
    debouncedQ.length > 0 &&
    results.length === 0 && (
      <div
        ref={listRef}
        style={{
          position: 'fixed',
          top: rect.bottom + 2,
          left: rect.left,
          width: rect.width,
        }}
        className={`${dropdownShell} px-3 py-3 text-center text-[10px] text-slate-500 dark:text-slate-400`}
      >
        No customers found
      </div>
    )

  return (
    <div className="relative min-w-0 w-full" ref={wrapperRef}>
      <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 dark:text-slate-400 pointer-events-none z-[1]" />
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        className={`${inputClassName} pl-7 pr-7`}
        placeholder="Search customer…"
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setIsOpen(true)
          if (value) onChange('')
        }}
        onFocus={() => {
          setIsOpen(true)
          updateRect()
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {query && (
        <button
          type="button"
          disabled={disabled}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 touch-manipulation cursor-pointer disabled:opacity-40"
          onMouseDown={e => e.preventDefault()}
          onClick={clear}
        >
          <X className="w-3 h-3" />
        </button>
      )}
      {createPortal(
        <>
          {dropdownContent}
          {noResults}
        </>,
        document.body,
      )}
    </div>
  )
}

interface SoReportItemPickerProps {
  powProfileName: string
  value: string
  onChange: (itemCode: string) => void
  disabled?: boolean
  inputClassName: string
}

/** Searchable item list (exact `item_code` on filter apply). */
export function SoReportItemPicker({
  powProfileName,
  value,
  onChange,
  disabled,
  inputClassName,
}: SoReportItemPickerProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const [results, setResults] = useState<SoReportItemRow[]>([])
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const { call: searchItems } = useFrappePostCall(API.searchSOReportItems)
  const searchItemsRef = useRef(searchItems)
  searchItemsRef.current = searchItems
  const debouncedQ = useDebounced(query.trim(), 280)

  useEffect(() => {
    if (!value) setQuery('')
  }, [value])

  const updateRect = useCallback(() => {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect())
  }, [])

  useEffect(() => {
    if (!isOpen || !powProfileName) return
    updateRect()
    const onScroll = () => updateRect()
    window.addEventListener('resize', onScroll, { passive: true })
    return () => window.removeEventListener('resize', onScroll)
  }, [isOpen, updateRect, powProfileName])

  useEffect(() => {
    if (!powProfileName || !isOpen) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const raw = unwrap(
          await searchItemsRef.current({
            pow_profile: powProfileName,
            txt: debouncedQ || undefined,
          }),
        )
        if (!cancelled && Array.isArray(raw)) setResults(raw as SoReportItemRow[])
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [debouncedQ, isOpen, powProfileName])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setHighlightIdx(-1)
  }, [results])

  const pick = useCallback(
    (row: SoReportItemRow) => {
      onChange(row.item_code)
      setQuery(`${row.item_name} (${row.item_code})`)
      setIsOpen(false)
      inputRef.current?.blur()
    },
    [onChange],
  )

  const clear = () => {
    setQuery('')
    onChange('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && highlightIdx >= 0 && results[highlightIdx]) {
      e.preventDefault()
      pick(results[highlightIdx])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const dropdownContent =
    isOpen &&
    rect &&
    (results.length > 0 || loading) && (
      <div
        ref={listRef}
        style={{
          position: 'fixed',
          top: rect.bottom + 2,
          left: rect.left,
          width: rect.width,
        }}
        className={dropdownShell}
      >
        {loading && results.length === 0 && (
          <div className="px-3 py-2 text-[10px] text-slate-500 dark:text-slate-400">Loading…</div>
        )}
        {results.map((row, idx) => (
          <button
            key={row.item_code}
            type="button"
            className={`${rowBtn} ${
              idx === highlightIdx
                ? 'bg-blue-50 dark:bg-slate-700/80'
                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
            onMouseDown={e => e.preventDefault()}
            onClick={() => pick(row)}
            onMouseEnter={() => setHighlightIdx(idx)}
          >
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-mono font-semibold text-slate-900 dark:text-white block truncate">
                {row.item_code}
              </span>
              <span className="text-[10px] text-slate-600 dark:text-slate-300 block truncate">{row.item_name}</span>
            </div>
          </button>
        ))}
      </div>
    )

  const noResults =
    isOpen &&
    rect &&
    !loading &&
    debouncedQ.length > 0 &&
    results.length === 0 && (
      <div
        ref={listRef}
        style={{
          position: 'fixed',
          top: rect.bottom + 2,
          left: rect.left,
          width: rect.width,
        }}
        className={`${dropdownShell} px-3 py-3 text-center text-[10px] text-slate-500 dark:text-slate-400`}
      >
        No items found
      </div>
    )

  return (
    <div className="relative min-w-0 w-full" ref={wrapperRef}>
      <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 dark:text-slate-400 pointer-events-none z-[1]" />
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        className={`${inputClassName} pl-7 pr-7`}
        placeholder="Search item (code or name)…"
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setIsOpen(true)
          if (value) onChange('')
        }}
        onFocus={() => {
          setIsOpen(true)
          updateRect()
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {query && (
        <button
          type="button"
          disabled={disabled}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 touch-manipulation cursor-pointer disabled:opacity-40"
          onMouseDown={e => e.preventDefault()}
          onClick={clear}
        >
          <X className="w-3 h-3" />
        </button>
      )}
      {createPortal(
        <>
          {dropdownContent}
          {noResults}
        </>,
        document.body,
      )}
    </div>
  )
}
