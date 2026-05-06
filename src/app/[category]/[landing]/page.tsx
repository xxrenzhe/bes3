import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { HardcoreEvidenceMatrix } from '@/components/site/HardcoreEvidenceMatrix'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { StructuredData } from '@/components/site/StructuredData'
import { getMultiConstraintLandingPage, getScenarioLandingPage, listHardcoreTags } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { buildScenarioPseoPath, buildValuePseoPath, getScenarioPseoStaticParams } from '@/lib/pseo'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildProductAggregateSchema } from '@/lib/structured-data'
import type { HardcoreProduct } from '@/lib/hardcore'

export const revalidate = 86400

export async function generateStaticParams() {
  const tags = await listHardcoreTags()
  return getScenarioPseoStaticParams(tags)
}

function normalizeScenarioSlug(category: string, landing: string) {
  const prefix = `best-${category}-for-`
  return landing.startsWith(prefix) ? landing.slice('best-'.length) : ''
}

function testedProductCount(products: HardcoreProduct[]) {
  return products.filter((product) => product.consensus.evidenceCount > 0).length
}

function isLiveScenario(status: string | null | undefined, products: HardcoreProduct[]) {
  return status === 'live' && testedProductCount(products) >= 3
}

function buildScenarioTitle({
  categoryName,
  tagLabel,
  products,
  status
}: {
  categoryName: string
  tagLabel: string
  products: HardcoreProduct[]
  status?: string | null
}) {
  const count = Math.max(testedProductCount(products), 1)
  if (!isLiveScenario(status, products)) {
    return `${categoryName} for ${tagLabel}: Evidence Check`
  }
  return `Best ${categoryName} for ${tagLabel}: ${count} Evidence-Checked Picks`
}

function buildBluf({
  products,
  tagLabel,
  status
}: {
  products: HardcoreProduct[]
  tagLabel: string
  status?: string | null
}) {
  const tested = testedProductCount(products)
  const evidenceCount = products.reduce((total, product) => total + product.consensus.evidenceCount, 0)
  const winner = products.find((product) => product.consensus.evidenceCount > 0) || products[0]
  const proof = winner?.consensus.bestQuote || winner?.evidence[0]

  if (!winner || !tested || !isLiveScenario(status, products)) {
    const proofText = proof?.evidenceQuote
      ? ` The clearest current proof says: "${proof.evidenceQuote}"`
      : ''
    return `Evidence check: Bes3 has found ${evidenceCount} timestamped YouTube evidence report${evidenceCount === 1 ? '' : 's'} across ${tested} product${tested === 1 ? '' : 's'} for ${tagLabel}.${proofText} That supports a source-backed research note, not a final ranking, because fewer than three independently evidenced products are available.`
  }

  return `Decision summary: Bes3 analyzed ${evidenceCount} creator evidence reports across ${tested} tested products for ${tagLabel}. ${winner.name} is currently the strongest evidence-backed pick${proof ? ` because reviewers found: "${proof.evidenceQuote}"` : ''}.`
}

function EvidenceStream({ products, isResearching }: { products: HardcoreProduct[]; isResearching: boolean }) {
  const reports = products.flatMap((product) =>
    product.evidence.slice(0, 3).map((report) => ({ product, report }))
  ).slice(0, 12)

  if (!reports.length) return null

  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Source Evidence</p>
        <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">
          {isResearching ? 'Timestamped YouTube proof and the gap it leaves.' : 'Creator quotes remain visible for source checking.'}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
          {isResearching
            ? 'The current evidence can support one narrow claim from one source. It cannot support a category-wide winner until more products are tested against the same need.'
            : 'Each quote stays tied to the product, source, rating, and timestamp so the recommendation can be checked against the original review.'}
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {reports.map(({ product, report }) => {
            const timestamp = report.youtubeId
              ? `https://www.youtube.com/watch?v=${report.youtubeId}${report.timestampSeconds ? `&t=${report.timestampSeconds}s` : ''}`
              : null
            return (
              <blockquote key={`${product.id}-${report.id}`} className="border-l-2 border-primary bg-white py-2 pl-4 text-sm leading-7 text-muted-foreground">
                {report.evidenceQuote}
                <span className="mt-2 block font-semibold text-foreground">
                  {product.name} · {report.rating} · {timestamp ? (
                    <a href={timestamp} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      Review by {report.channelName}
                    </a>
                  ) : (
                    `Review by ${report.channelName}`
                  )}
                </span>
              </blockquote>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function buildDecisionFit(products: HardcoreProduct[], tagLabel: string) {
  const tested = testedProductCount(products)
  const strongest = products.find((product) => product.consensus.evidenceCount > 0) || products[0] || null
  const bestQuote = strongest?.consensus.bestQuote || strongest?.evidence[0] || null
  const hasDealSignal = strongest?.price.entryStatus === 'best-deal' || strongest?.price.entryStatus === 'great-value'
  const isResearching = !strongest || tested < 3

  return {
    strongest,
    isResearching,
    buySignals: [
      tested >= 3
        ? `${tested} products have usable creator evidence for ${tagLabel}.`
        : `Only ${tested} product${tested === 1 ? '' : 's'} currently clears the evidence bar for ${tagLabel}.`,
      strongest?.consensus.score10 != null
        ? isResearching
          ? `${strongest.name} has a ${strongest.consensus.score10.toFixed(1)}/10 source score from the current matched evidence.`
          : `${strongest.name} leads with a ${strongest.consensus.score10.toFixed(1)}/10 consensus score.`
        : 'Consensus scoring is still waiting for more aligned evidence.',
      hasDealSignal
        ? `${strongest!.name} has a ${strongest!.price.label.toLowerCase()} signal.`
        : strongest
          ? `${strongest.name} does not yet have a strong buy-window signal.`
          : 'Price-value timing is still unavailable.'
    ],
    skipSignals: [
      isResearching
        ? 'Skip treating this as a final ranking until at least three products have useful evidence.'
        : 'Skip products with no timestamped quote, even if their specs look strong.',
      strongest?.consensus.controversy
        ? `${strongest.name} has contradictory creator evidence, so read the proof before buying.`
        : isResearching
          ? 'Do not treat one matched source as proof that this is the best model for every pool.'
          : 'Skip the winner claim if the evidence stream does not match your exact use case.',
      strongest?.affiliateStatus === 'out_of_stock'
        ? `${strongest.name} is out of stock, so use the alternatives path instead of forcing the top pick.`
        : 'Skip buying immediately when the price window is normal or overpriced.'
    ],
    proof: bestQuote
  }
}

function DecisionFitSection({ products, tagLabel }: { products: HardcoreProduct[]; tagLabel: string }) {
  const decision = buildDecisionFit(products, tagLabel)
  const heading = decision.isResearching
    ? 'What the current evidence proves, and what it does not.'
    : 'Who should act on this page, and who should wait.'
  const intro = decision.isResearching
    ? `For ${tagLabel}, the current data is strong enough to preserve a source-backed note and too thin to name a category winner. The useful decision is whether the quoted proof matches your pool, not whether the page has found the best model yet.`
    : `This summary converts evidence count, consensus score, creator proof, and price-value timing into a direct buying decision for ${tagLabel}.`

  return (
    <section className="border-y border-border bg-slate-950 px-4 py-14 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">
            {decision.isResearching ? 'Research Status' : 'Decision Fit'}
          </p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">
            {heading}
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            {intro}
          </p>
          {decision.proof ? (
            <blockquote className="mt-6 border-l-2 border-emerald-300 pl-4 text-sm leading-7 text-slate-200">
              {decision.proof.evidenceQuote}
              <span className="mt-2 block font-semibold text-white">Review by {decision.proof.channelName}</span>
            </blockquote>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-emerald-300/30 bg-white/10 p-5">
            <h3 className="text-base font-bold text-white">{decision.isResearching ? 'What is usable now' : 'Use this page when'}</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
              {decision.buySignals.map((signal) => (
                <li key={signal} className="pl-1">{signal}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-amber-300/30 bg-white/10 p-5">
            <h3 className="text-base font-bold text-white">{decision.isResearching ? 'Do not over-read it' : 'Wait or verify when'}</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
              {decision.skipSignals.map((signal) => (
                <li key={signal} className="pl-1">{signal}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

function RelatedPseoLinks({
  categorySlug,
  categoryName,
  valuePath,
  tagLabel
}: {
  categorySlug: string
  categoryName: string
  valuePath: string
  tagLabel: string
}) {
  const links = [
    { href: `/categories/${categorySlug}`, label: `Top ${categoryName} list` },
    { href: valuePath, label: `${categoryName} under $500` },
    { href: '/products', label: 'Full evidence matrix' },
    { href: '/deals', label: 'Best Value Lab' }
  ]

  return (
    <section className="px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl border-t border-border pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Related Evidence</p>
        <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">
          Looking for more options for {tagLabel}?
        </h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ category: string; landing: string }>
}): Promise<Metadata> {
  const resolved = await params
  const routeSlug = normalizeScenarioSlug(resolved.category, resolved.landing)
  const page = routeSlug ? await getScenarioLandingPage(resolved.category, routeSlug) : null
  const multiPage = page ? null : await getMultiConstraintLandingPage(resolved.category, resolved.landing)
  if (!page) {
    if (multiPage) {
      const tagLabel = multiPage.tags.map((tag) => tag.name).join(' + ')
      const isResearching = !isLiveScenario(multiPage.status, multiPage.products)
      return buildPageMetadata({
        title: buildScenarioTitle({ categoryName: multiPage.category.name, tagLabel, products: multiPage.products, status: multiPage.status }),
        description: isResearching
          ? `Research snapshot for ${multiPage.category.name} and ${tagLabel}: current YouTube proof, price context, and missing evidence before a final ranking.`
          : `Bes3 cross-checks ${multiPage.category.name} against both ${tagLabel} using teardown evidence and price-value signals.`,
        path: `/${multiPage.category.slug}/${resolved.landing}`,
        locale: await getRequestLocale(),
        robots: isResearching ? { index: false, follow: true } : undefined,
        keywords: [`${multiPage.category.name} ${tagLabel} evidence`, 'multi constraint product evidence', 'YouTube review proof']
      })
    }
    return buildPageMetadata({
      title: 'Scenario Researching',
      description: 'This Bes3 scenario page is not ready yet.',
      path: `/${resolved.category}/${resolved.landing}`,
      locale: await getRequestLocale(),
      robots: { index: false, follow: true }
    })
  }

  const isResearching = !isLiveScenario(page.status, page.products)
  return buildPageMetadata({
    title: buildScenarioTitle({ categoryName: page.category.name, tagLabel: page.tag.name, products: page.products, status: page.status }),
    description: isResearching
      ? `Research snapshot for ${page.category.name} and ${page.tag.name}: current YouTube proof, price context, and missing evidence before a final ranking.`
      : `Bes3 analyzes creator teardown evidence to rank the best ${page.category.name} for ${page.tag.name}.`,
    path: buildScenarioPseoPath(page.category.slug, page.tag.slug),
    locale: await getRequestLocale(),
    robots: isResearching ? { index: false, follow: true } : undefined,
    keywords: [`${page.category.name} ${page.tag.name} evidence`, `${page.tag.name} ${page.category.name}`, 'YouTube review proof']
  })
}

export default async function ScenarioLandingPage({
  params
}: {
  params: Promise<{ category: string; landing: string }>
}) {
  const resolved = await params
  const routeSlug = normalizeScenarioSlug(resolved.category, resolved.landing)
  const page = routeSlug ? await getScenarioLandingPage(resolved.category, routeSlug) : null
  const multiPage = page ? null : await getMultiConstraintLandingPage(resolved.category, resolved.landing)
  if (!page && !multiPage) notFound()
  const path = page
    ? buildScenarioPseoPath(page.category.slug, page.tag.slug)
    : `/${multiPage!.category.slug}/${resolved.landing}`
  const products = page ? page.products : multiPage!.products
  const tagLabel = page ? page.tag.name : multiPage!.tags.map((tag) => tag.name).join(' + ')
  const categoryName = page ? page.category.name : multiPage!.category.name
  const categorySlug = page ? page.category.slug : multiPage!.category.slug
  const status = page ? page.status : multiPage!.status
  const isResearching = !isLiveScenario(status, products)
  const valuePath = buildValuePseoPath(categorySlug, 500)
  const title = buildScenarioTitle({ categoryName, tagLabel, products, status })
  const bluf = buildBluf({ products, tagLabel, status })
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Categories', path: '/categories' },
    { name: categoryName, path: `/categories/${categorySlug}` },
    { name: tagLabel, path }
  ]
  const faqEntries = isResearching
    ? [
        {
          question: page ? `Why does this page focus on ${page.tag.name}?` : 'Why combine these constraints?',
          answer: page
            ? `${page.tag.name} is treated as a core buyer need, but the current page is only a source check because the evidence set is still small.`
            : 'This page checks whether one product can satisfy multiple buyer constraints, but it stays in research mode until enough products have matching evidence.'
        },
        {
          question: 'Why is this not a finished recommendation?',
          answer: 'Bes3 requires at least three independently evidenced products before calling a scenario page a ranked guide. This page currently has fewer than that threshold.'
        },
        {
          question: page ? `What can I verify for ${page.tag.name}?` : 'What can I verify here?',
          answer: page
            ? `You can verify the ${page.tag.name} quote, source link, source score, price window, and evidence count before deciding whether the claim fits your situation.`
            : 'You can verify the matched quotes, source links, source scores, price windows, and which constraints still need more evidence.'
        }
      ]
    : [
        {
          question: page ? `Why does this page focus on ${page.tag.name}?` : 'Why combine these constraints?',
          answer: page
            ? `${page.tag.name} is treated as a core buyer need. Products only deserve a ranking when Bes3 finds real review coverage for that use case.`
            : 'Multi-constraint pages only rank products when the same body of review evidence supports more than one real buyer need.'
        },
        {
          question: 'Why can this page show researching instead of a winner?',
          answer: 'The rule is no fabricated winners. A scenario page needs at least three products with useful evidence before it becomes a live recommendation matrix.'
        },
        {
          question: page ? `How does Bes3 prove the ${page.tag.name} ranking?` : 'How does Bes3 prove a multi-constraint ranking?',
          answer: page
            ? `The page keeps crawler-visible creator quotes, timestamp links, consensus scores, and price-value timing together so the ${page.tag.name} recommendation can be checked against source evidence.`
            : 'The page only promotes products when creator evidence covers the required constraints, then keeps the quotes, timestamps, consensus scores, and price timing visible for verification.'
        }
      ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildCollectionPageSchema({
            path,
            title,
            description: `Scenario matrix for ${page ? page.category.name : multiPage!.category.name}.`,
            about: [
              { '@type': 'Thing', name: categoryName },
              { '@type': 'Thing', name: tagLabel },
              { '@type': 'Thing', name: 'YouTube review evidence' }
            ],
            breadcrumbItems,
            items: products.map((product) => ({
              name: product.name,
              path: `/products/${product.slug}`
            }))
          }),
          ...products.slice(0, 10).map((product) =>
            buildProductAggregateSchema({
              path: `/products/${product.slug}`,
              name: product.name,
              description: `${product.name} ranked with creator teardown evidence, scenario ratings, and price-value timing for ${title}.`,
              image: product.imageUrl,
              ratingValue: product.consensus.score5,
              reviewCount: product.consensus.evidenceCount,
              offerUrl: product.affiliateUrl ? `/go/${product.id}` : null,
              price: product.price.currentPrice,
              priceCurrency: product.price.currency,
              availabilityStatus: product.affiliateStatus
            })
          ),
          buildBreadcrumbSchema(path, breadcrumbItems),
          buildFaqSchema(path, faqEntries)
        ]}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">
            {isResearching ? 'Research Snapshot' : 'Evidence-Checked Buying Guide'}
          </p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            {title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            {bluf}
          </p>
          {isResearching ? (
            <div className="mt-8 grid gap-4 text-sm leading-7 text-muted-foreground md:grid-cols-3">
              <div className="rounded-md border border-border bg-white p-4">
                <p className="font-semibold text-foreground">Current evidence</p>
                <p className="mt-2">{testedProductCount(products)} product{testedProductCount(products) === 1 ? '' : 's'} with usable creator evidence.</p>
              </div>
              <div className="rounded-md border border-border bg-white p-4">
                <p className="font-semibold text-foreground">Publish threshold</p>
                <p className="mt-2">Needs at least 3 independently evidenced products before this becomes a ranked guide.</p>
              </div>
              <div className="rounded-md border border-border bg-white p-4">
                <p className="font-semibold text-foreground">How to use it</p>
                <p className="mt-2">Check the quote, timestamp, price window, and gaps before making a buying decision.</p>
              </div>
            </div>
          ) : null}
        </div>
      </section>
      <DecisionFitSection products={products} tagLabel={tagLabel} />
      <HardcoreEvidenceMatrix products={products} emptyTitle={`${title} is still below the evidence threshold.`} isResearching={isResearching} />
      <EvidenceStream products={products} isResearching={isResearching} />
      <section className="px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SeoFaqSection
            title={isResearching ? 'Evidence FAQ' : 'Scenario FAQ'}
            entries={faqEntries}
            description={isResearching ? 'These answers explain why the page is useful for source checking but not yet strong enough for a final ranking.' : 'Each answer repeats the same evidence threshold and source-checking rules used by the JSON-LD payload.'}
          />
        </div>
      </section>
      <RelatedPseoLinks categorySlug={categorySlug} categoryName={categoryName} valuePath={valuePath} tagLabel={tagLabel} />
    </PublicShell>
  )
}
