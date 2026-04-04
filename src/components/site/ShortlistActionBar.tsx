'use client'

import { Heart, Scale } from 'lucide-react'
import { useShortlist } from '@/components/site/ShortlistProvider'
import { type ShortlistItem } from '@/lib/shortlist'
import { cn } from '@/lib/utils'

export function ShortlistActionBar({
  item,
  compact = false,
  className,
  source = 'site'
}: {
  item: ShortlistItem
  compact?: boolean
  className?: string
  source?: string
}) {
  const { hasHydrated, isCompared, isShortlisted, toggleCompare, toggleShortlist } = useShortlist()
  const shortlisted = hasHydrated ? isShortlisted(item.id) : false
  const compared = hasHydrated ? isCompared(item.id) : false

  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      <button
        type="button"
        onClick={() => toggleShortlist(item, source)}
        className={cn(
          'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
          shortlisted ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-border bg-white text-foreground hover:bg-muted',
          compact ? 'px-3 text-xs' : ''
        )}
      >
        <Heart className={cn('h-4 w-4', shortlisted ? 'fill-current' : '')} />
        {shortlisted ? 'Saved' : 'Save'}
      </button>
      <button
        type="button"
        onClick={() => toggleCompare(item, source)}
        className={cn(
          'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
          compared ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-white text-foreground hover:bg-muted',
          compact ? 'px-3 text-xs' : ''
        )}
      >
        <Scale className="h-4 w-4" />
        {compared ? 'In Compare' : 'Compare'}
      </button>
    </div>
  )
}
