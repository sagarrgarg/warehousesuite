import { useMemo } from 'react'

interface BarcodeSVGProps {
  value: string
  height?: number
  className?: string
}

interface BarcodeRect {
  x: number
  width: number
}

// Code 128 B patterns for ASCII 32 (' ') to 126 ('~')
const CODE128_PATTERNS: string[] = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213", // 32-41
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132", // 42-51
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211", // 52-61
  "212123","212321","201213","111323","131123","131321","112313","132113","132311","211313", // 72-71
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331", // 72-81
  "231131","213113","213311","213131","311123","311321","313112","312113","312311","332111", // 82-91
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214", // 92-101
  "112412","122114","122411"                                                               // 102-104 (Start A, B, C)
]

const START_B = "211214"
const STOP = "2331112"

export default function BarcodeSVG({ value, height = 60, className = '' }: BarcodeSVGProps) {
  const bars = useMemo<{ rects: BarcodeRect[]; totalWidth: number }>(() => {
    if (!value) return { rects: [], totalWidth: 0 }
    const str = String(value)
    
    // Code 128B checksum calculation
    let checksum = 104 // Start B
    const patternSequence: string[] = [START_B]

    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i)
      const asciiIndex = charCode >= 32 && charCode <= 126 ? charCode - 32 : 0
      checksum += asciiIndex * (i + 1)
      patternSequence.push(CODE128_PATTERNS[asciiIndex] || CODE128_PATTERNS[0])
    }

    const checkIndex = checksum % 103
    patternSequence.push(CODE128_PATTERNS[checkIndex] || CODE128_PATTERNS[0])
    patternSequence.push(STOP)

    const fullPattern = patternSequence.join('')
    
    // Convert pattern string (widths 1..4) into x-positions and bar widths
    const rects: BarcodeRect[] = []
    let currentX = 0
    let isBar = true

    for (let i = 0; i < fullPattern.length; i++) {
      const width = parseInt(fullPattern[i], 10)
      if (isBar) {
        rects.push({ x: currentX, width })
      }
      currentX += width
      isBar = !isBar
    }

    return { rects, totalWidth: currentX }
  }, [value])

  if (!bars.rects || bars.rects.length === 0) {
    return <div className="h-12 flex items-center justify-center text-xs text-slate-400">No Barcode Data</div>
  }

  return (
    <div className={`flex flex-col items-center w-full overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${bars.totalWidth} ${height}`}
        className="w-full h-auto max-h-16"
        preserveAspectRatio="none"
      >
        {bars.rects.map((r: BarcodeRect, idx: number) => (
          <rect
            key={idx}
            x={r.x}
            y={0}
            width={r.width}
            height={height}
            fill="currentColor"
          />
        ))}
      </svg>
    </div>
  )
}
