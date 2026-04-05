import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'
import type { DropdownItem } from '@/types'

/** Readable qty in picker rows (avoids 10.000000 noise). */
function formatPickerStockQty(q: number): string {
  if (!Number.isFinite(q)) return '0'
  const n = Math.round(q * 1_000_000) / 1_000_000
  return String(n)
}

export interface ItemSearchInputHandle {
  /** Focus the field and insert a printable key (home-screen typeahead). */
  ingestPrintableKey: (key: string) => void
}

interface ItemSearchProps {
  items: DropdownItem[]
  value: string
  onSelect: (itemCode: string) => void
  placeholder?: string
  className?: string
}

/**
 * Searchable typeahead for item selection.
 * Dropdown renders via portal with position:fixed so it escapes
 * all overflow containers and stacking contexts.
 */
const ItemSearchInput = forwardRef<ItemSearchInputHandle, ItemSearchProps>(function ItemSearchInput(
  { items, value, onSelect, placeholder, className },
  ref,
) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const valueRef = useRef(value)
  valueRef.current = value
  /** Skip clearing query when value becomes '' right after global typeahead clears selection. */
  const skipEmptyValueSyncRef = useRef(false)

  useEffect(() => {
    if (value) {
      setQuery(value)
      return
    }
    if (skipEmptyValueSyncRef.current) {
      skipEmptyValueSyncRef.current = false
      return
    }
    setQuery('')
  }, [value])

  useImperativeHandle(ref, () => ({
    ingestPrintableKey: (key: string) => {
      const hadSelection = Boolean(valueRef.current)
      if (hadSelection) {
        skipEmptyValueSyncRef.current = true
        onSelect('')
      }
      setQuery(q => (hadSelection ? key : q + key))
      setIsOpen(true)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        if (inputRef.current) setRect(inputRef.current.getBoundingClientRect())
      })
    },
  }), [onSelect])

  const updateRect = useCallback(() => {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect())
  }, [])

  useEffect(() => {
    if (!isOpen) return

    updateRect()

    const scrollParents: HTMLElement[] = []
    let el = wrapperRef.current?.parentElement ?? null
    while (el) {
      const style = getComputedStyle(el)
      if (/(auto|scroll)/.test(style.overflow + style.overflowY)) {
        scrollParents.push(el)
      }
      el = el.parentElement
    }

    const onScroll = () => updateRect()
    scrollParents.forEach(sp => sp.addEventListener('scroll', onScroll, { passive: true }))
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      scrollParents.forEach(sp => sp.removeEventListener('scroll', onScroll))
      window.removeEventListener('resize', onScroll)
    }
  }, [isOpen, updateRect])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        wrapperRef.current && !wrapperRef.current.contains(target) &&
        listRef.current && !listRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 60)
    const q = query.toLowerCase()
    return items.filter(i =>
      i.item_code.toLowerCase().includes(q) || i.item_name.toLowerCase().includes(q)
    ).slice(0, 60)
  }, [items, query])

  useEffect(() => { setHighlightIdx(-1) }, [filtered])

  const pick = useCallback((itemCode: string) => {
    onSelect(itemCode)
    setQuery(itemCode)
    setIsOpen(false)
    inputRef.current?.blur()
  }, [onSelect])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(prev => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && highlightIdx >= 0 && filtered[highlightIdx]) {
      e.preventDefault()
      pick(filtered[highlightIdx].item_code)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const clear = () => {
    setQuery('')
    onSelect('')
    inputRef.current?.focus()
  }

  const dropdownContent = isOpen && rect && filtered.length > 0 && (
    <div
      ref={listRef}
      style={{
        position: 'fixed',
        top: rect.bottom + 2,
        left: rect.left,
        width: rect.width,
      }}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded shadow-xl max-h-56 overflow-y-auto z-[9999]"
    >
      {filtered.map((i, idx) => (
        <button
          key={i.item_code}
          type="button"
          className={`w-full text-left px-2.5 py-1.5 flex items-start gap-2 border-b border-slate-50 dark:border-slate-700 last:border-b-0 touch-manipulation transition-colors ${
            idx === highlightIdx ? 'bg-blue-50 dark:bg-slate-700/80' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 active:bg-slate-100 dark:active:bg-slate-600'
          }`}
          onMouseDown={e => e.preventDefault()}
          onClick={() => pick(i.item_code)}
          onMouseEnter={() => setHighlightIdx(idx)}
        >
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-slate-900 dark:text-white block truncate">{i.item_code}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">{i.item_name}</span>
          </div>
          {(i.stock_qty ?? 0) > 0 && i.stock_uom && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-300 font-bold tabular-nums shrink-0 text-right leading-tight">
              <span className="block">{formatPickerStockQty(i.stock_qty ?? 0)}</span>
              <span className="block text-[9px] font-semibold opacity-90">{i.stock_uom}</span>
            </span>
          )}
        </button>
      ))}
    </div>
  )

  const noResults = isOpen && rect && query.trim().length > 0 && filtered.length === 0 && (
    <div
      ref={listRef}
      style={{
        position: 'fixed',
        top: rect.bottom + 2,
        left: rect.left,
        width: rect.width,
      }}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded shadow-xl z-[9999] px-3 py-3 text-center text-[10px] text-slate-500 dark:text-slate-400"
    >
      No items found
    </div>
  )

  return (
    <div className={`relative flex-1 min-w-0 ${className ?? ''}`} ref={wrapperRef}>
      <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 dark:text-slate-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded pl-6 pr-7 py-1.5 text-[11px] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-300 placeholder:text-slate-500 dark:text-slate-400"
        placeholder={placeholder ?? 'Search item...'}
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setIsOpen(true)
          if (value) onSelect('')
        }}
        onFocus={() => { setIsOpen(true); updateRect() }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {query && (
        <button
          type="button"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 touch-manipulation"
          onMouseDown={e => e.preventDefault()}
          onClick={clear}
        >
          <X className="w-3 h-3" />
        </button>
      )}
      {createPortal(<>{dropdownContent}{noResults}</>, document.body)}
    </div>
  )
})

export default ItemSearchInput
