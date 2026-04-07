import type { Metadata } from 'next'
import { PublicShell } from '@/components/layout/PublicShell'
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
  const sharedIds = parseShortlistShareValue((await searchParams).items)
  const sharedItems = (await listPublishedProductsByIds(sharedIds)).map(toShortlistItem)

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        <ShortlistWorkspace sharedItems={sharedItems} />
      </div>
    </PublicShell>
  )
}
