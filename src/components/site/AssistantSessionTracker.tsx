'use client'

import { useEffect } from 'react'
import { trackDecisionEvent } from '@/lib/decision-tracking'

export function AssistantSessionTracker({
  query,
  category,
  budget,
  mustCount,
  avoidCount,
  urgency,
  recommendationIds
}: {
  query: string
  category?: string | null
  budget?: number | null
  mustCount: number
  avoidCount: number
  urgency: string
  recommendationIds: number[]
}) {
  useEffect(() => {
    if (!query.trim()) return

    trackDecisionEvent({
      eventType: 'assistant_session_start',
      source: 'assistant-page',
      metadata: {
        query,
        category: category || null,
        urgency,
        recommendationCount: recommendationIds.length,
        recommendationIds
      }
    })

    if (category || budget != null || mustCount > 0 || avoidCount > 0) {
      trackDecisionEvent({
        eventType: 'assistant_constraint_add',
        source: 'assistant-page',
        metadata: {
          category: category || null,
          budget: budget ?? null,
          mustCount,
          avoidCount,
          urgency
        }
      })
    }
  }, [avoidCount, budget, category, mustCount, query, recommendationIds, urgency])

  return null
}
