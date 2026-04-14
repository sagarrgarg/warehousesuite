import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type MouseEvent as ReactMouseEvent,
} from 'react'

/** Relative flex weights for the three POW columns (WO, transfer requests, incoming). */
export type PowColumnFlex = [number, number, number]

const STORAGE_KEY = 'warehousesuite.pow.columnFlex'

const MIN_FR = 0.42
const MAX_FR = 4.5
const DEFAULT: PowColumnFlex = [1, 1, 1]

function clampFr(t: PowColumnFlex): PowColumnFlex {
  return [
    Math.min(MAX_FR, Math.max(MIN_FR, t[0])),
    Math.min(MAX_FR, Math.max(MIN_FR, t[1])),
    Math.min(MAX_FR, Math.max(MIN_FR, t[2])),
  ]
}

function loadFlex(): PowColumnFlex {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const j = JSON.parse(raw) as unknown
      if (Array.isArray(j) && j.length === 3 && j.every((x) => typeof x === 'number')) {
        return clampFr(j as PowColumnFlex)
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT
}

/** Gutter width between columns (px); must match `w-1.5` Tailwind (6px) × 2 + tiny gap ≈ 14 */
export const POW_COLUMN_GUTTER_TOTAL_PX = 14

/**
 * Draggable two-gutter layout for desktop POW columns. Persists weights in localStorage.
 *
 * @param sectionRef – Width used to convert mouse movement into flex deltas.
 */
export function usePowColumnLayout(sectionRef: RefObject<HTMLElement | null>) {
  const [flex, setFlex] = useState<PowColumnFlex>(loadFlex)
  const [dragging, setDragging] = useState(false)
  const dragGutterRef = useRef<0 | 1 | null>(null)
  const flexDragRef = useRef<PowColumnFlex>(flex)
  flexDragRef.current = flex

  const persist = useCallback((f: PowColumnFlex) => {
    const c = clampFr(f)
    setFlex(c)
    flexDragRef.current = c
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragGutterRef.current === null) return
      const el = sectionRef.current
      if (!el) return
      const innerW = Math.max(1, el.getBoundingClientRect().width - POW_COLUMN_GUTTER_TOTAL_PX)
      const sum = flexDragRef.current[0] + flexDragRef.current[1] + flexDragRef.current[2]
      const deltaFr = (e.movementX / innerW) * sum
      const f = flexDragRef.current
      let next: PowColumnFlex
      if (dragGutterRef.current === 0) {
        next = [f[0] + deltaFr, f[1] - deltaFr, f[2]]
      } else {
        next = [f[0], f[1] + deltaFr, f[2] - deltaFr]
      }
      const c = clampFr(next)
      if (c[0] === f[0] && c[1] === f[1] && c[2] === f[2]) return
      flexDragRef.current = c
      setFlex(c)
    }
    const onUp = () => {
      if (dragGutterRef.current === null) return
      dragGutterRef.current = null
      setDragging(false)
      persist(flexDragRef.current)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [sectionRef, persist])

  const startDrag = useCallback(
    (gutter: 0 | 1) => (e: ReactMouseEvent) => {
      e.preventDefault()
      dragGutterRef.current = gutter
      flexDragRef.current = flex
      setDragging(true)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [flex],
  )

  const setPreset = useCallback(
    (preset: 'equal' | 'wo' | 'mr' | 'incoming') => {
      const presets: Record<typeof preset, PowColumnFlex> = {
        equal: [1, 1, 1],
        wo: [2.4, 0.8, 0.8],
        mr: [0.8, 2.4, 0.8],
        incoming: [0.8, 0.8, 2.4],
      }
      persist(presets[preset])
    },
    [persist],
  )

  const sum = flex[0] + flex[1] + flex[2]
  const w0 = flex[0] / sum
  const w1 = flex[1] / sum
  const w2 = flex[2] / sum

  return {
    flex,
    dragging,
    startDrag,
    setPreset,
    /** Unitless width fractions (sum 1). Use with calc((100% - gutterPx) * wx). */
    columnWidths: { w0, w1, w2 } as const,
  }
}
