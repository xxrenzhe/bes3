import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PurchaseDecisionCard } from '@/components/commerce/PurchaseDecisionCard'
import { PublicShell } from '@/components/layout/PublicShell'
import { HardcoreEvidenceMatrix } from '@/components/site/HardcoreEvidenceMatrix'
import { StructuredData } from '@/components/site/StructuredData'
import { getHardcoreCategory, type HardcoreProduct } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { buildEvidencePurchaseDecision } from '@/lib/purchase-decision'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema, buildFaqSchema } from '@/lib/structured-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function testedProductCount(products: HardcoreProduct[]) {
  return products.filter((product) => product.consensus.evidenceCount > 0).length
}

function totalEvidenceCount(products: HardcoreProduct[]) {
  return products.reduce((total, product) => total + product.consensus.evidenceCount, 0)
}

function currentCategoryPick(products: HardcoreProduct[]) {
  return products.find((product) => product.consensus.evidenceCount > 0) || null
}

function productDisplayName(product: HardcoreProduct) {
  if (!product.brand) return product.name
  const normalizedName = product.name.toLowerCase()
  const normalizedBrand = product.brand.toLowerCase()
  const brandLead = normalizedBrand.split(/\s+/)[0]
  return normalizedName.startsWith(normalizedBrand) || normalizedName.startsWith(brandLead)
    ? product.name
    : `${product.brand} ${product.name}`
}

function buildCategoryDecisionBoard(products: HardcoreProduct[], categoryName: string) {
  const tested = testedProductCount(products)
  const evidence = totalEvidenceCount(products)
  const currentPick = currentCategoryPick(products)
  const isFullGuide = tested >= 3 && evidence > 0
  const hasShortlist = Boolean(currentPick)
  const valuePick = products.find((product) => product.price.entryStatus === 'best-deal' || product.price.entryStatus === 'great-value') || null

  if (isFullGuide) {
    return {
      stateLabel: 'Compare first',
      heading: `Compare the checked ${categoryName} picks before buying.`,
      summary: `Bes3 has enough review-backed coverage to compare the leading ${categoryName} options, but the right move is still to match proof, price timing, and downside to your use case before clicking out.`,
      usable: [
        `${tested} products have source-backed review proof in this category.`,
        `${evidence} review signal${evidence === 1 ? '' : 's'} are visible for checking the ranking.`,
        valuePick ? `${productDisplayName(valuePick)} currently has the strongest value-window signal.` : 'Price timing is visible, but no product has a strong value-window edge yet.'
      ],
      blocked: [
        'Do not buy only from rank order; match the proof quote to your actual use case.',
        'Skip any model whose merchant terms, stock, or return policy changed on the live store page.',
        'Wait when the price-value badge says normal or overpriced and the need is not urgent.'
      ]
    }
  }

  if (hasShortlist && currentPick) {
    return {
      stateLabel: 'Use as a shortlist',
      heading: `Use ${productDisplayName(currentPick)} as a starting point, not a fake category winner.`,
      summary: `Bes3 found usable review proof for ${categoryName}, but not enough comparable products to pretend the whole category is ranked. Treat this page as a guarded shortlist and verify the exact proof before buying.`,
      usable: [
        `${productDisplayName(currentPick)} has matched review proof and can anchor the first comparison.`,
        `${evidence} review signal${evidence === 1 ? '' : 's'} are available for source checking.`,
        currentPick.price.currentPrice == null ? 'Price is still missing, so the next move is comparison rather than checkout.' : `${productDisplayName(currentPick)} is currently shown at ${currentPick.price.label.toLowerCase()}.`
      ],
      blocked: [
        'Do not force a category winner until at least three products have useful review proof.',
        'Do not assume one creator quote covers every buyer use case in this category.',
        'Use Compare Picks or Start With Your Need if the current proof does not match your situation.'
      ]
    }
  }

  return {
    stateLabel: 'Proof pending',
    heading: `${categoryName} is still proof pending, so Bes3 will not name a winner.`,
    summary: 'This page is useful as a coverage checkpoint, not a buying recommendation. Bes3 waits for model-safe review proof before turning a category into a ranked guide.',
    usable: [
      'Use the use-case links to see what Bes3 is trying to verify next.',
      'Use Start With Your Need to describe the product constraints and bad-buy signs.',
      'Use Compare Picks to move into categories that already have stronger review proof.'
    ],
    blocked: [
      'Do not force a buy from this page yet.',
      'No store-link push appears until proof, price, and merchant health can be checked.',
      'A spec sheet or generic review mention is not enough to create a Bes3 winner.'
    ]
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = await getHardcoreCategory((await params).slug)
  if (!page) {
    return buildPageMetadata({
      title: 'Category Researching',
      description: 'This category is not currently part of the public Bes3 coverage set.',
      path: '/categories',
      locale: await getRequestLocale(),
      robots: { index: false, follow: true }
    })
  }

  return buildPageMetadata({
    title: `${page.category.name} Best Picks`,
    description: `Hands-on review proof, buyer use cases, and price timing for ${page.category.name}.`,
    path: `/categories/${page.category.slug}`,
    locale: await getRequestLocale(),
    robots: page.products.filter((product) => product.consensus.evidenceCount > 0).length < 3 ? { index: false, follow: true } : undefined,
    keywords: [page.category.name, 'review proof', 'buyer reviews', ...page.category.painpoints]
  })
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = await getHardcoreCategory((await params).slug)
  if (!page) notFound()
  const faqEntries = [
    {
      question: `What counts as evidence for ${page.category.name}?`,
      answer: 'A product needs hands-on review proof tied to a real buyer use case, plus a rating and a quote or timestamp. Official specs alone are not enough.'
    },
    {
      question: 'Why are there only a few tags?',
      answer: 'Bes3 groups search, community, and on-site questions into a smaller set of buyer use cases so the page stays decision-focused.'
    }
  ]
  const creatorStats = new Map<string, { evidenceCount: number; maxRank: number; authorityTier: string }>()
  for (const product of page.products) {
    for (const report of product.evidence) {
      const current = creatorStats.get(report.channelName) || {
        evidenceCount: 0,
        maxRank: 0,
        authorityTier: report.authorityTier
      }
      creatorStats.set(report.channelName, {
        evidenceCount: current.evidenceCount + 1,
        maxRank: Math.max(current.maxRank, report.bloggerRank),
        authorityTier: current.maxRank >= report.bloggerRank ? current.authorityTier : report.authorityTier
      })
    }
  }
  const topCreators = Array.from(creatorStats.entries())
    .map(([channelName, stats]) => ({ channelName, ...stats }))
    .sort((left, right) => right.maxRank - left.maxRank || right.evidenceCount - left.evidenceCount)
    .slice(0, 4)
  const topDecisions = page.products.slice(0, 3).map((product, index) =>
    buildEvidencePurchaseDecision(product, {
      pageType: 'category',
      trackingSource: 'category-decision-card',
      categoryHref: `/categories/${page.category.slug}`,
      alternativeHref: `/categories/${page.category.slug}`,
      hasAlternatives: index > 0,
      userIntent: `best ${page.category.name}`
    })
  )
  const testedCount = testedProductCount(page.products)
  const evidenceCount = totalEvidenceCount(page.products)
  const isFullGuide = testedCount >= 3 && evidenceCount > 0
  const categoryDecision = buildCategoryDecisionBoard(page.products, page.category.name)
  const heroEyebrow = isFullGuide ? 'Best Picks' : categoryDecision.stateLabel
  const heroTitle = isFullGuide
    ? `The ${page.category.name} picks that matter first.`
    : `${page.category.name}: useful next steps before Bes3 calls a winner.`
  const heroSummary = isFullGuide
    ? 'Start with the current Top 3 checked picks. Review proof, source notes, and use-case coverage stay below for verification.'
    : 'Bes3 turns thin evidence into a guarded shortlist, not a fake ranking. Use this page to see what is usable now, what is blocked, and where to go next.'

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildCollectionPageSchema({
            path: `/categories/${page.category.slug}`,
            title: `${page.category.name} Best Picks`,
            description: `Reviewed picks, current price context, and visible downsides for ${page.category.name}.`,
            items: page.products.map((product) => ({
              name: product.name,
              path: `/products/${product.slug}`
            }))
          }),
          buildFaqSchema(`/categories/${page.category.slug}`, faqEntries)
        ]}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">{heroEyebrow}</p>
            <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
              {heroTitle}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              {heroSummary}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#category-decision" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
                See Buy / Compare / Wait
              </Link>
              <Link href="/start" className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-semibold hover:border-primary hover:text-primary">
                Start With Your Need
              </Link>
            </div>
          </div>
          <div className="rounded-md border border-border bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Browse by use case</p>
            <div className="mt-4 flex flex-col gap-3">
              {page.tags.slice(0, 6).map((tag) => (
                <Link key={tag.slug} href={`/${page.category.slug}/best-${page.category.slug}-for-${tag.slug}`} className="rounded-md bg-slate-50 px-4 py-3 text-sm font-semibold hover:bg-emerald-50 hover:text-primary">
                  Best {page.category.name} for {tag.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section id="category-decision" className="scroll-mt-24 border-y border-border bg-slate-950 px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">Category Decision Board</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">
              {categoryDecision.heading}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              {categoryDecision.summary}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ['Checked products', testedCount ? `${testedCount}` : '0'],
                ['Review signals', evidenceCount ? `${evidenceCount}` : '0'],
                ['Buyer state', categoryDecision.stateLabel]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
                  <p className="mt-2 font-[var(--font-display)] text-2xl font-black tracking-tight text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-300/30 bg-white/10 p-5">
              <h3 className="text-base font-bold text-white">What is usable now</h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
                {categoryDecision.usable.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-amber-300/30 bg-white/10 p-5">
              <h3 className="text-base font-bold text-white">Wait, skip, or verify when</h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
                {categoryDecision.blocked.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-2">
            <Link href="#consensus-matrix" className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-slate-950">
              Check review proof
            </Link>
            <Link href="/categories" className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white hover:border-emerald-300 hover:text-emerald-200">
              Compare Picks
            </Link>
            <Link href="/start" className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white hover:border-emerald-300 hover:text-emerald-200">
              Start With Your Need
            </Link>
          </div>
        </div>
      </section>
      <section className="border-y border-border bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">
            {isFullGuide ? 'Top 3 checked picks' : 'Current checked shortlist'}
          </p>
          {topDecisions.length ? (
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {topDecisions.map((decision) => (
                <PurchaseDecisionCard key={decision.productId} decision={decision} className="h-full" />
              ))}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                ['Do not force a buy', 'No checked product has enough review proof, price context, and merchant health to become a recommendation yet.', '#category-decision', 'Read decision board'],
                ['Compare Picks', 'Move to categories with stronger proof when this exact category is still pending.', '/categories', 'Compare reviewed categories'],
                ['Start With Your Need', 'Tell Alex the product type, deal-breakers, and bad-buy signs so the next pass can narrow the evidence search.', '/start', 'Start a tighter request']
              ].map(([title, note, href, label]) => (
                <div key={title} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                  <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight">{title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{note}</p>
                  <Link href={href} className="mt-5 inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold hover:border-primary hover:text-primary">
                    {label}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="border-y border-border bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Review Sources</p>
          <h2 className="mt-3 max-w-4xl font-[var(--font-display)] text-3xl font-black tracking-tight">
            Strong review sources stay separate from store availability.
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {(topCreators.length ? topCreators : [{ channelName: 'Researching', evidenceCount: 0, maxRank: 0, authorityTier: 'pending' }]).map((creator) => (
              <div key={creator.channelName} className="rounded-md border border-border bg-white p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{creator.authorityTier}</p>
                <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight">{creator.channelName}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {creator.evidenceCount} review excerpt{creator.evidenceCount === 1 ? '' : 's'} · source rating {creator.maxRank.toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <HardcoreEvidenceMatrix products={page.products} emptyTitle={`${page.category.name} is still waiting for enough aligned review proof.`} isResearching={!isFullGuide} />
    </PublicShell>
  )
}
