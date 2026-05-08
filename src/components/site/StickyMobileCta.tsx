'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { buildTrackedMerchantExitPath, trackDecisionEvent } from '@/lib/decision-tracking'
import type { PurchaseDecisionState } from '@/lib/purchase-decision'

const SCROLL_DELTA = 18

const ACTION_TONES: Record<PurchaseDecisionState, string> = {
  buy_now: 'bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] text-primary-foreground shadow-lg shadow-emerald-950/10',
  compare_first: 'bg-sky-950 text-white shadow-lg shadow-sky-950/10',
  watch_price: 'bg-amber-950 text-white shadow-lg shadow-amber-950/10',
  skip: 'bg-white text-rose-950 ring-1 ring-rose-200',
  researching: 'bg-slate-950 text-white shadow-lg shadow-slate-950/10',
  link_unavailable: 'bg-white text-zinc-950 ring-1 ring-zinc-300'
}

export function StickyMobileCta({
  href,
  label = 'Check Current Price',
  productId,
  trackingSource = 'site',
  trackingMetadata,
  actionTone = 'buy_now',
  triggerOffset = 520,
  eyebrow = 'Ready to buy?',
  trustBadge = 'Hand-tested by Alex | Ad-free independent review'
}: {
  href?: string | null
  label?: string
  productId?: number | null
  trackingSource?: string
  trackingMetadata?: Record<string, unknown>
  actionTone?: PurchaseDecisionState
  triggerOffset?: number
  eyebrow?: string
  trustBadge?: string
}) {
  const [resolvedHref, setResolvedHref] = useState(href)
  const [isVisible, setIsVisible] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
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

  useEffect(() => {
    if (typeof window === 'undefined' || !resolvedHref) return

    let lastScrollY = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const pastTrigger = currentScrollY > triggerOffset

      if (!pastTrigger) {
        setIsVisible(false)
        setIsCollapsed(false)
        lastScrollY = currentScrollY
        return
      }

      setIsVisible(true)

      if (currentScrollY - lastScrollY > SCROLL_DELTA) {
        setIsCollapsed(true)
      } else if (lastScrollY - currentScrollY > SCROLL_DELTA) {
        setIsCollapsed(false)
      }

      lastScrollY = currentScrollY
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [resolvedHref, triggerOffset])

  if (!resolvedHref) return null

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 px-3 pb-4 pt-3 transition-transform duration-200 sm:hidden ${
        isVisible ? (isCollapsed ? 'translate-y-14' : 'translate-y-0') : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
    >
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-3 shadow-[0_-10px_35px_-20px_rgba(15,23,42,0.45)] backdrop-blur">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
        <p className="mt-2 text-xs text-muted-foreground">{trustBadge}</p>
        <Link
          href={resolvedHref}
          target="_blank"
          rel="noopener noreferrer"
          prefetch={false}
          onClick={() => {
            if (!productId) return
            trackDecisionEvent({
              eventType: resolvedHref.startsWith('/go/') ? 'merchant_cta_click' : 'purchase_decision_cta_click',
              source: trackingSource,
              productId,
              metadata: trackingMetadata
            })
          }}
          className={`mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold ${ACTION_TONES[actionTone]}`}
        >
          {label}
          {resolvedHref.startsWith('/go/') ? <span aria-hidden="true">↗</span> : null}
        </Link>
      </div>
    </div>
  )
}
