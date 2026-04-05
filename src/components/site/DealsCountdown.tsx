'use client'

import { useEffect, useMemo, useState } from 'react'

function formatTime(value: number) {
  return value.toString().padStart(2, '0')
}

export function DealsCountdown({
  durationHours = 5
}: {
  durationHours?: number
}) {
  const targetTime = useMemo(() => Date.now() + durationHours * 60 * 60 * 1000, [durationHours])
  const [remainingMs, setRemainingMs] = useState(Math.max(0, targetTime - Date.now()))

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingMs(Math.max(0, targetTime - Date.now()))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [targetTime])

  const totalSeconds = Math.floor(remainingMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return (
    <div className="rounded-[1.5rem] bg-white/95 px-5 py-4 text-left shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Sale timer</p>
      <p className="mt-2 text-2xl font-black text-foreground">
        {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">Use the timer as urgency context, not a reason to force the wrong purchase.</p>
    </div>
  )
}
