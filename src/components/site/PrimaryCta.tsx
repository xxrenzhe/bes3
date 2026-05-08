'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { buildTrackedMerchantExitPath, trackDecisionEvent } from '@/lib/decision-tracking'
import { cn } from '@/lib/utils'

export function PrimaryCta({
  href,
  label = 'Check Current Price',
  note,
  productId,
  trackingSource = 'site',
  trackingMetadata,
  trustBadge = 'Hand-tested by Alex | Ad-free independent review',
  className,
  buttonClassName,
  showAffiliateDisclosure = true
}: {
  href?: string | null
  label?: string
  note?: string
  productId?: number | null
  trackingSource?: string
  trackingMetadata?: Record<string, unknown>
  trustBadge?: string
  className?: string
  buttonClassName?: string
  showAffiliateDisclosure?: boolean
}) {
  const [resolvedHref, setResolvedHref] = useState(href)
  const metadataKey = JSON.stringify(trackingMetadata || null)

  useEffect(() => {
    if (!href) {
      setResolvedHref(null)
      return
    }

    if (!productId || !href.startsWith('/go/')) {
      setResolvedHref(href)
      return
    }

    setResolvedHref(buildTrackedMerchantExitPath(productId, trackingSource, null, trackingMetadata))
  }, [href, productId, trackingSource, metadataKey, trackingMetadata])

  return (
    <div className={cn('space-y-2', className)}>
      {resolvedHref ? (
        <Link
          href={resolvedHref}
          target="_blank"
          rel="noopener noreferrer"
          prefetch={false}
          onClick={() => {
            if (!productId) return
            trackDecisionEvent({
              eventType: 'merchant_cta_click',
              source: trackingSource,
              productId,
              metadata: trackingMetadata
            })
          }}
          className={cn(
            'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-emerald-950/10 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            buttonClassName
          )}
        >
          {label}
          <span aria-hidden="true">↗</span>
        </Link>
      ) : (
        <div
          aria-disabled="true"
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-muted px-6 py-3 text-sm font-semibold text-muted-foreground"
        >
          Store link not ready yet
        </div>
      )}
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      {trustBadge ? <p className="text-xs font-medium text-muted-foreground">{trustBadge}</p> : null}
      {showAffiliateDisclosure ? (
        <p className="text-xs text-muted-foreground">
          {resolvedHref
            ? 'Affiliate disclosure: Bes3 may earn from qualifying purchases at no extra cost to you.'
            : 'Bes3 only sends buyers to a store after the link has been checked.'}
        </p>
      ) : null}
    </div>
  )
}
