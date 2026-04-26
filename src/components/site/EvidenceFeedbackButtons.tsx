'use client'

import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState, useTransition } from 'react'

export function EvidenceFeedbackButtons({ analysisReportId }: { analysisReportId: number }) {
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function send(feedbackType: 'useful' | 'inaccurate') {
    setMessage('')
    startTransition(async () => {
      const response = await fetch('/api/open/evidence/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisReportId, feedbackType })
      })
      setMessage(response.ok ? 'Feedback recorded.' : 'Unable to record feedback.')
    })
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => send('useful')}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold hover:border-primary hover:text-primary disabled:opacity-60"
      >
        <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
        Useful
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => send('inaccurate')}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold hover:border-primary hover:text-primary disabled:opacity-60"
      >
        <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
        Not accurate
      </button>
      {message ? <span className="text-xs font-semibold text-muted-foreground">{message}</span> : null}
    </div>
  )
}
