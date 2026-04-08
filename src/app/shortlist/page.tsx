import type { Metadata } from 'next'
import { PublicShell } from '@/components/layout/PublicShell'
import { ShoppingTaskMemoryBeacon } from '@/components/site/ShoppingTaskMemoryBeacon'
import { ShortlistWorkspace } from '@/components/site/ShortlistWorkspace'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { listPublishedProductsByIds } from '@/lib/site-data'
import { parseShortlistShareValue, toShortlistItem } from '@/lib/shortlist'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Shortlist',
    description:
      'Keep your saved picks together, compare the best options, and switch to price alerts without starting over.',
    path: '/shortlist',
    locale: getRequestLocale(),
    robots: {
      index: false,
      follow: true
    }
  })
}

export default async function ShortlistPage({
  searchParams
}: {
  searchParams: Promise<{ items?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const sharedIds = parseShortlistShareValue(resolvedSearchParams.items)
  const sharedItems = (await listPublishedProductsByIds(sharedIds)).map(toShortlistItem)
  const shortlistPath = resolvedSearchParams.items ? `/shortlist?items=${encodeURIComponent(resolvedSearchParams.items)}` : '/shortlist'

  return (
    <PublicShell>
      <ShoppingTaskMemoryBeacon
        href={shortlistPath}
        label={sharedItems.length ? 'Resume shared shortlist' : 'Resume shortlist'}
        description="Return to the same shortlist so your saved picks, compare state, and wait decisions stay together."
        source="shortlist"
      />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        <ShortlistWorkspace sharedItems={sharedItems} />
      </div>
    </PublicShell>
  )
}
