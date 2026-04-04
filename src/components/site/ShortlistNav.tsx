'use client'

import Link from 'next/link'
import { Heart, Scale } from 'lucide-react'
import { useShortlist } from '@/components/site/ShortlistProvider'
import { cn } from '@/lib/utils'

export function ShortlistNav({
  mobile = false
}: {
  mobile?: boolean
}) {
  const { compareCount, hasHydrated, shortlistCount } = useShortlist()

  return (
    <Link
      href="/shortlist"
      className={cn(
        'inline-flex items-center gap-2 rounded-full transition-colors',
        mobile ? 'px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-primary' : 'px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-primary'
      )}
    >
      <Heart className="h-4 w-4" />
      <span>Shortlist</span>
      {hasHydrated && shortlistCount ? (
        <span className={cn('inline-flex min-w-[22px] items-center justify-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground', mobile ? '' : 'shadow-sm')}>
          {shortlistCount}
        </span>
      ) : null}
      {hasHydrated && compareCount ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <Scale className="h-3.5 w-3.5" />
          {compareCount}
        </span>
      ) : null}
    </Link>
  )
}
