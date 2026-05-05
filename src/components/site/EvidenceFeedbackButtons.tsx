'use client'

import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState, useTransition } from 'react'

export function EvidenceFeedbackButtons({ analysisReportId }: { analysisReportId: number }) {
  const [message, setMessage] = useState('')
  const [selectedFeedback, setSelectedFeedback] = useState<'useful' | 'inaccurate' | null>(null)
  const [isPending, startTransition] = useTransition()

  function send(feedbackType: 'useful' | 'inaccurate') {
    setMessage('')
    startTransition(async () => {
      const response = await fetch('/api/open/evidence/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisReportId, feedbackType })
      })
      if (response.ok) setSelectedFeedback(feedbackType)
      setMessage(response.ok ? 'Feedback recorded.' : 'Unable to record feedback.')
    })
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        aria-pressed={selectedFeedback === 'useful'}
        onClick={() => send('useful')}
        className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full border border-border px-4 text-xs font-semibold transition-[border-color,color,background-color,transform] hover:-translate-y-0.5 hover:border-primary hover:text-primary aria-pressed:border-primary aria-pressed:bg-emerald-50 aria-pressed:text-primary disabled:translate-y-0 disabled:opacity-60"
      >
        <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
        Useful
      </button>
      <button
        type="button"
        disabled={isPending}
        aria-pressed={selectedFeedback === 'inaccurate'}
        onClick={() => send('inaccurate')}
        className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full border border-border px-4 text-xs font-semibold transition-[border-color,color,background-color,transform] hover:-translate-y-0.5 hover:border-primary hover:text-primary aria-pressed:border-primary aria-pressed:bg-emerald-50 aria-pressed:text-primary disabled:translate-y-0 disabled:opacity-60"
      >
        <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
        Not accurate
      </button>
      {message ? (
        <span role="status" aria-live="polite" className="text-xs font-semibold text-muted-foreground">
          {message}
        </span>
      ) : null}
    </div>
  )
}
