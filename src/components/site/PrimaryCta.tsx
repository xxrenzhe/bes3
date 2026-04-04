'use client'

import Link from 'next/link'
import { trackDecisionEvent } from '@/lib/decision-tracking'

export function PrimaryCta({
  href,
  label = 'Check Current Price',
  note,
  productId,
  trackingSource = 'site'
}: {
  href?: string | null
  label?: string
  note?: string
  productId?: number | null
  trackingSource?: string
}) {
  return (
    <div className="space-y-2">
      {href ? (
        <Link
          href={href}
          target="_blank"
          prefetch={false}
          onClick={() => {
            if (!productId) return
            trackDecisionEvent({
              eventType: 'merchant_cta_click',
              source: trackingSource,
              productId
            })
          }}
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-emerald-950/10 transition-transform hover:-translate-y-0.5"
        >
          {label}
          <span aria-hidden="true">↗</span>
        </Link>
      ) : (
        <div
          aria-disabled="true"
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-muted px-6 py-3 text-sm font-semibold text-muted-foreground"
        >
          Merchant link pending verification
        </div>
      )}
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      <p className="text-xs text-muted-foreground">
        {href
          ? 'Affiliate disclosure: Bes3 may earn from qualifying purchases at no extra cost to you.'
          : 'Bes3 only sends buyers off-site after a merchant link is verified.'}
      </p>
    </div>
  )
}
