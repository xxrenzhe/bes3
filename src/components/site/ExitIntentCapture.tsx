'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { BellRing, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { trackDecisionEvent } from '@/lib/decision-tracking'
import { addLocaleToPath, getExitIntentDictionary, stripLocaleFromPath, type SiteLocale } from '@/lib/i18n'
import { buildNewsletterPath } from '@/lib/newsletter-path'

const DISMISS_KEY = 'bes3-exit-intent-dismissed-until'
const CAPTURED_KEY = 'bes3-exit-intent-captured'
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 24 * 7
const ARM_DELAY_MS = 8000

function shouldSuppressPrompt(pathname: string) {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/go/') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/newsletter') ||
    pathname.startsWith('/thank-you')
  )
}

function deriveCaptureIntent(pathname: string) {
  if (pathname.startsWith('/categories/')) return 'category-brief'
  if (pathname.startsWith('/brands/') && pathname.includes('/categories/')) return 'category-brief'
  // Public routing and copy stay on /offers; /deals remains compatibility only.
  if (pathname.startsWith('/offers') || pathname.startsWith('/biggest-discounts') || pathname.startsWith('/deals')) return 'offers'
  return 'price-alert'
}

function deriveCategorySlug(pathname: string) {
  const brandCategoryMatch = pathname.match(/^\/brands\/[^/]+\/categories\/([^/]+)/)
  if (brandCategoryMatch?.[1]) return brandCategoryMatch[1]

  const categoryMatch = pathname.match(/^\/categories\/([^/]+)/)
  return categoryMatch?.[1] || ''
}

export function ExitIntentCapture({
  locale,
  pathname
}: {
  locale: SiteLocale
  pathname: string
}) {
  const dictionary = getExitIntentDictionary(locale)
  const basePath = stripLocaleFromPath(pathname)
  const categorySlug = deriveCategorySlug(basePath)
  const intent = deriveCaptureIntent(basePath)
  const alertSettingsPath = addLocaleToPath(
    buildNewsletterPath({
      intent,
      category: categorySlug,
      cadence: 'priority',
      returnTo: basePath,
      returnLabel: 'Resume current page',
      returnDescription: 'Return to the same page after saving the wait update instead of restarting from a generic update screen.'
    }),
    locale
  )
  const [email, setEmail] = useState('')
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const armedRef = useRef(false)
  const hasShownRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (shouldSuppressPrompt(basePath)) return

    try {
      if (window.localStorage.getItem(CAPTURED_KEY) === 'true') return
      const dismissedUntil = Number(window.localStorage.getItem(DISMISS_KEY) || '0')
      if (dismissedUntil > Date.now()) return
    } catch {
      return
    }

    const canUseMouseExit = window.matchMedia('(pointer:fine)').matches
    if (!canUseMouseExit) return

    const armTimer = window.setTimeout(() => {
      armedRef.current = true
    }, ARM_DELAY_MS)

    const handleMouseOut = (event: MouseEvent) => {
      if (!armedRef.current || hasShownRef.current || open || document.hidden) return
      if (event.relatedTarget) return
      if (event.clientY > 12) return

      hasShownRef.current = true
      setOpen(true)
      trackDecisionEvent({
        eventType: 'exit_intent_prompt_view',
        source: 'exit-intent-modal',
        metadata: {
          pathname: basePath,
          intent,
          categorySlug: categorySlug || undefined
        }
      })
    }

    document.addEventListener('mouseout', handleMouseOut)

    return () => {
      window.clearTimeout(armTimer)
      document.removeEventListener('mouseout', handleMouseOut)
    }
  }, [basePath, categorySlug, intent, open])

  const dismissPrompt = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_WINDOW_MS))
    } catch {
      // Non-blocking when storage is unavailable.
    }

    trackDecisionEvent({
      eventType: 'exit_intent_prompt_dismiss',
      source: 'exit-intent-modal',
      metadata: {
        pathname: basePath
      }
    })
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && open && !done) {
          dismissPrompt()
          return
        }
        setOpen(nextOpen)
      }}
    >
      <DialogContent className="max-w-2xl overflow-hidden rounded-[2rem] border-none bg-[linear-gradient(135deg,#fffef8_0%,#f4fbff_48%,#eefaf5_100%)] p-0 shadow-[0_40px_90px_-40px_rgba(15,23,42,0.55)]">
        <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-[linear-gradient(180deg,#0f172a_0%,#134e4a_100%)] p-8 text-white md:p-10">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-emerald-200">
              <BellRing className="h-7 w-7" />
            </div>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200/80">{dictionary.kicker}</p>
            <h2 className="mt-4 font-[var(--font-display)] text-3xl font-black tracking-tight">{dictionary.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-200">{dictionary.description}</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-[1.25rem] border border-white/12 bg-white/8 p-4">
                <p className="text-sm font-semibold text-white">{dictionary.reassurance}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/12 bg-white/8 p-4">
                <p className="text-sm text-slate-200">{dictionary.urgency}</p>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-10">
            <DialogHeader className="space-y-3 text-left">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <DialogTitle className="font-[var(--font-display)] text-3xl font-black tracking-tight text-slate-950">
                {done ? 'You are on the list.' : 'Keep the next good move in your inbox.'}
              </DialogTitle>
              <DialogDescription className="text-sm leading-7 text-slate-600">
                {done ? dictionary.reassurance : dictionary.helper}
              </DialogDescription>
            </DialogHeader>

            {done ? (
              <div className="mt-8 space-y-4">
                <div className="rounded-[1.5rem] bg-emerald-50 p-5 text-sm leading-7 text-emerald-900">
                  Bes3 will watch for the next useful update{categorySlug ? ` in ${categorySlug.replace(/-/g, ' ')}` : ''} and email you when it matters.
                </div>
                <Link
                  href={alertSettingsPath}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-emerald-200 bg-white px-6 text-sm font-semibold text-primary transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                >
                  Review wait settings
                </Link>
              </div>
            ) : (
              <form
                className="mt-8 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  startTransition(async () => {
                    const response = await fetch('/api/newsletter', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        email,
                        intent,
                        cadence: 'priority',
                        categorySlug,
                        source: `exit-intent:${basePath}`,
                        notes: `Captured from exit intent on ${basePath}`
                      })
                    })
                    if (!response.ok) return

                    try {
                      window.localStorage.setItem(CAPTURED_KEY, 'true')
                    } catch {
                      // Storage is optional.
                    }

                    trackDecisionEvent({
                      eventType: 'exit_intent_prompt_signup',
                      source: 'exit-intent-modal',
                      metadata: {
                        pathname: basePath,
                        intent,
                        categorySlug: categorySlug || undefined
                      }
                    })
                    setDone(true)
                  })
                }}
              >
                <Input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={dictionary.emailPlaceholder}
                  className="min-h-[56px] rounded-2xl border-slate-200 bg-white px-5"
                />
                <Button type="submit" disabled={!email.includes('@') || isPending} className="min-h-[56px] w-full rounded-full px-6">
                  {isPending ? 'Saving...' : dictionary.primaryCta}
                </Button>
                <button
                  type="button"
                  onClick={dismissPrompt}
                  className="w-full rounded-full px-6 py-3 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-950"
                >
                  {dictionary.secondaryCta}
                </button>
                <p className="text-xs leading-6 text-slate-500">{dictionary.helper}</p>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
