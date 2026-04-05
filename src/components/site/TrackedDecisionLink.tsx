'use client'

import Link, { type LinkProps } from 'next/link'
import { type ReactNode } from 'react'
import { trackDecisionEvent } from '@/lib/decision-tracking'
import { type DecisionEventType } from '@/lib/decision-event-types'

export function TrackedDecisionLink({
  href,
  className,
  children,
  eventType,
  source,
  productId,
  metadata
}: LinkProps & {
  className?: string
  children: ReactNode
  eventType?: DecisionEventType
  source?: string
  productId?: number | null
  metadata?: Record<string, unknown>
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        if (!eventType) return
        trackDecisionEvent({
          eventType,
          source,
          productId,
          metadata
        })
      }}
    >
      {children}
    </Link>
  )
}
