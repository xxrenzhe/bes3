'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { buildTrackedMerchantExitPath, trackDecisionEvent } from '@/lib/decision-tracking'

const SCROLL_DELTA = 18

export function StickyMobileCta({
  href,
  label = 'Check Current Price',
  productId,
  trackingSource = 'site',
  triggerOffset = 520,
  eyebrow = 'Ready to buy?',
  trustBadge = '✅ Hand-tested by Alex | Ad-free independent review'
}: {
  href?: string | null
  label?: string
  productId?: number | null
  trackingSource?: string
  triggerOffset?: number
  eyebrow?: string
  trustBadge?: string
}) {
  const [resolvedHref, setResolvedHref] = useState(href)
  const [isVisible, setIsVisible] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (!href) {
      setResolvedHref(null)
      return
    }

    if (!productId || !href.startsWith('/go/')) {
      setResolvedHref(href)
      return
    }

    setResolvedHref(buildTrackedMerchantExitPath(productId, trackingSource))
  }, [href, productId, trackingSource])

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
          prefetch={false}
          onClick={() => {
            if (!productId) return
            trackDecisionEvent({
              eventType: 'merchant_cta_click',
              source: trackingSource,
              productId
            })
          }}
          className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-emerald-950/10"
        >
          {label}
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </div>
  )
}
