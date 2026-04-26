'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'bes3_cookie_consent_v1'

type ConsentState = 'accepted-essential' | 'rejected-nonessential'

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(!window.localStorage.getItem(STORAGE_KEY))
  }, [])

  function storeConsent(value: ConsentState) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        value,
        storedAt: new Date().toISOString()
      })
    )
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-border bg-white px-4 py-4 shadow-[0_-16px_50px_-30px_rgba(15,23,42,0.45)] sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Cookie controls</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Bes3 uses essential storage for site preferences and may use affiliate attribution links through PartnerBoost or YeahPromos. Nonessential tracking stays off unless you accept it.
          </p>
          <Link href="/privacy" className="mt-2 inline-flex text-sm font-semibold text-primary hover:underline">
            Privacy policy
          </Link>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => storeConsent('rejected-nonessential')}
            className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:border-primary"
          >
            Reject all
          </button>
          <button
            type="button"
            onClick={() => storeConsent('accepted-essential')}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Accept essential
          </button>
        </div>
      </div>
    </div>
  )
}
