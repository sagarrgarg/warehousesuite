import { useState, useEffect, useRef, useCallback } from 'react'
import { useFrappeGetCall } from 'frappe-react-sdk'
import { AlertTriangle } from 'lucide-react'
import { API } from '@/lib/api'

interface Props {
  powProfileName: string | null
}

interface Notification {
  message: string
  criticality: 'Low' | 'Medium' | 'High' | 'Critical'
  display_seconds: number
}

const STYLES: Record<string, { bg: string; blinkBg: string; text: string; icon: string; border: string }> = {
  Low: {
    bg: 'bg-slate-300 dark:bg-slate-600',
    blinkBg: 'bg-slate-300 dark:bg-slate-600',
    text: 'text-slate-900 dark:text-slate-100',
    icon: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-400 dark:border-slate-500',
  },
  Medium: {
    bg: 'bg-amber-300 dark:bg-amber-700',
    blinkBg: 'bg-amber-300 dark:bg-amber-700',
    text: 'text-amber-950 dark:text-amber-100',
    icon: 'text-amber-800 dark:text-amber-200',
    border: 'border-amber-400 dark:border-amber-600',
  },
  High: {
    bg: 'bg-red-400 dark:bg-red-700',
    blinkBg: 'bg-red-600 dark:bg-red-500',
    text: 'text-white dark:text-white',
    icon: 'text-white dark:text-white',
    border: 'border-red-500 dark:border-red-600',
  },
  Critical: {
    bg: 'bg-red-600 dark:bg-red-600',
    blinkBg: 'bg-red-800 dark:bg-red-400',
    text: 'text-white dark:text-white',
    icon: 'text-white dark:text-white',
    border: 'border-red-700 dark:border-red-500',
  },
}

export default function NotificationBanner({ powProfileName }: Props) {
  const { data } = useFrappeGetCall<{ message: Notification[] }>(
    API.getActivePowNotifications,
    powProfileName ? { pow_profile: powProfileName } : undefined,
    powProfileName ? undefined : null,
    { revalidateOnFocus: true, refreshInterval: 60000 },
  )
  const notifications = data?.message ?? []

  const [currentIdx, setCurrentIdx] = useState(0)
  const [animState, setAnimState] = useState<'visible' | 'exit' | 'enter'>('visible')
  const [blink, setBlink] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const blinkRef = useRef<ReturnType<typeof setInterval>>()

  const currentNotif = notifications.length > 0
    ? notifications[currentIdx % notifications.length]
    : null

  const scheduleNext = useCallback(() => {
    if (notifications.length <= 1) return
    const displayMs = (currentNotif?.display_seconds ?? 5) * 1000
    timerRef.current = setTimeout(() => {
      // Start exit animation (fold up)
      setAnimState('exit')
      setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % notifications.length)
        // Start enter animation (fold down from top)
        setAnimState('enter')
        setTimeout(() => {
          setAnimState('visible')
        }, 350)
      }, 350)
    }, displayMs)
  }, [notifications.length, currentNotif?.display_seconds])

  useEffect(() => {
    scheduleNext()
    return () => clearTimeout(timerRef.current)
  }, [currentIdx, scheduleNext])

  useEffect(() => {
    setCurrentIdx(0)
    setAnimState('visible')
  }, [notifications])

  // Blink for High/Critical
  useEffect(() => {
    const crit = currentNotif?.criticality
    if (crit === 'High' || crit === 'Critical') {
      blinkRef.current = setInterval(() => setBlink(b => !b), crit === 'Critical' ? 400 : 700)
      return () => { clearInterval(blinkRef.current); setBlink(false) }
    } else {
      setBlink(false)
    }
  }, [currentNotif?.criticality])

  if (notifications.length === 0) return null

  const style = STYLES[currentNotif?.criticality ?? 'Low'] || STYLES.Low
  const isHighOrCritical = currentNotif?.criticality === 'High' || currentNotif?.criticality === 'Critical'

  const animClass =
    animState === 'exit'
      ? 'translate-y-[100%] opacity-0 scale-y-0'
      : animState === 'enter'
        ? 'translate-y-[-100%] opacity-0 scale-y-0'
        : 'translate-y-0 opacity-100 scale-y-100'

  return (
    <div
      className={`shrink-0 border-b overflow-hidden transition-colors duration-200 ${style.border} ${
        isHighOrCritical && blink ? style.blinkBg : style.bg
      }`}
    >
      <div
        className={`flex items-center justify-center gap-2 px-3 py-1 min-h-[24px] origin-top transition-all duration-300 ease-in-out ${animClass}`}
      >
        {isHighOrCritical && (
          <AlertTriangle className={`w-4 h-4 shrink-0 ${style.icon} ${blink ? 'opacity-100' : 'opacity-70'}`} />
        )}
        <p className={`text-xs font-bold uppercase tracking-wider text-center ${style.text}`}>
          {currentNotif?.message}
        </p>
        {isHighOrCritical && (
          <AlertTriangle className={`w-4 h-4 shrink-0 ${style.icon} ${blink ? 'opacity-100' : 'opacity-70'}`} />
        )}
      </div>
      {notifications.length > 1 && (
        <div className="flex justify-center gap-1 pb-0.5 -mt-1">
          {notifications.map((_, i) => (
            <span
              key={i}
              className={`w-1 h-1 rounded-full transition-all duration-300 ${
                i === currentIdx % notifications.length
                  ? `${style.icon} scale-125`
                  : `${style.icon} opacity-30`
              }`}
              style={{ backgroundColor: 'currentColor' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
