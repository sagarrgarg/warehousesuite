import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'
import type { DropdownItem } from '@/types'

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
export default function ItemSearchInput({ items, value, onSelect, placeholder, className }: ItemSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (value) setQuery(value)
    else setQuery('')
  }, [value])

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
      className="bg-white border border-slate-200 rounded shadow-xl max-h-56 overflow-y-auto z-[9999]"
    >
      {filtered.map((i, idx) => (
        <button
          key={i.item_code}
          type="button"
          className={`w-full text-left px-2.5 py-1.5 flex items-start gap-2 border-b border-slate-50 last:border-b-0 touch-manipulation transition-colors ${
            idx === highlightIdx ? 'bg-blue-50' : 'hover:bg-slate-50 active:bg-slate-100'
          }`}
          onMouseDown={e => e.preventDefault()}
          onClick={() => pick(i.item_code)}
          onMouseEnter={() => setHighlightIdx(idx)}
        >
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-slate-900 block truncate">{i.item_code}</span>
            <span className="text-[10px] text-slate-500 block truncate">{i.item_name}</span>
          </div>
          {(i.stock_qty ?? 0) > 0 && (
            <span className="text-[9px] text-emerald-600 font-bold tabular-nums shrink-0 mt-0.5">
              {i.stock_qty} {i.stock_uom}
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
      className="bg-white border border-slate-200 rounded shadow-xl z-[9999] px-3 py-3 text-center text-[10px] text-slate-400"
    >
      No items found
    </div>
  )

  return (
    <div className={`relative flex-1 min-w-0 ${className ?? ''}`} ref={wrapperRef}>
      <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        className="w-full bg-slate-50 border border-slate-200 rounded pl-6 pr-7 py-1.5 text-[11px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-300 placeholder:text-slate-400"
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
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600 touch-manipulation"
          onMouseDown={e => e.preventDefault()}
          onClick={clear}
        >
          <X className="w-3 h-3" />
        </button>
      )}
      {createPortal(<>{dropdownContent}{noResults}</>, document.body)}
    </div>
  )
}
