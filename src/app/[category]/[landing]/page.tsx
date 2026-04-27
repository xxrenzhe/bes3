import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { HardcoreEvidenceMatrix } from '@/components/site/HardcoreEvidenceMatrix'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { StructuredData } from '@/components/site/StructuredData'
import { getMultiConstraintLandingPage, getScenarioLandingPage } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema, buildFaqSchema, buildProductAggregateSchema } from '@/lib/structured-data'
import type { HardcoreProduct } from '@/lib/hardcore'

function normalizeScenarioSlug(category: string, landing: string) {
  const prefix = `best-${category}-for-`
  return landing.startsWith(prefix) ? landing.slice('best-'.length) : ''
}

function testedProductCount(products: HardcoreProduct[]) {
  return products.filter((product) => product.consensus.evidenceCount > 0).length
}

function buildScenarioTitle({
  categoryName,
  tagLabel,
  products
}: {
  categoryName: string
  tagLabel: string
  products: HardcoreProduct[]
}) {
  const count = Math.max(testedProductCount(products), 1)
  return `Reddit Consensus: The ${count} Best ${categoryName} for ${tagLabel} (2026 Tested)`
}

function buildBluf({
  products,
  tagLabel
}: {
  products: HardcoreProduct[]
  tagLabel: string
}) {
  const tested = testedProductCount(products)
  const evidenceCount = products.reduce((total, product) => total + product.consensus.evidenceCount, 0)
  const winner = products.find((product) => product.consensus.evidenceCount > 0) || products[0]
  const proof = winner?.consensus.bestQuote || winner?.evidence[0]

  if (!winner || !tested) {
    return `BLUF: Bes3 is still researching ${tagLabel}. This page stays noindex until enough aligned products have creator evidence, price baselines, and usable quotes.`
  }

  return `BLUF: Bes3 analyzed ${evidenceCount} creator evidence reports across ${tested} tested products for ${tagLabel}. ${winner.name} is currently the strongest evidence-backed pick${proof ? ` because reviewers found: "${proof.evidenceQuote}"` : ''}.`
}

function EvidenceStream({ products }: { products: HardcoreProduct[] }) {
  const reports = products.flatMap((product) =>
    product.evidence.slice(0, 3).map((report) => ({ product, report }))
  ).slice(0, 12)

  if (!reports.length) return null

  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Evidence Stream</p>
        <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">Creator quotes remain visible to humans and crawlers.</h2>
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
        ? `${strongest.name} leads with a ${strongest.consensus.score10.toFixed(1)}/10 consensus score.`
        : 'Consensus scoring is still waiting for more aligned evidence.',
      hasDealSignal
        ? `${strongest!.name} is in a ${strongest!.price.label.toLowerCase()} price window.`
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

  return (
    <section className="border-y border-border bg-slate-950 px-4 py-14 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">Decision Fit</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">
            Who should act on this page, and who should wait.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            This summary converts evidence count, consensus score, creator proof, and price-value timing into a direct buying decision for {tagLabel}.
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
            <h3 className="text-base font-bold text-white">Use this page when</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
              {decision.buySignals.map((signal) => (
                <li key={signal} className="pl-1">{signal}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-amber-300/30 bg-white/10 p-5">
            <h3 className="text-base font-bold text-white">Wait or verify when</h3>
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
      return buildPageMetadata({
        title: buildScenarioTitle({ categoryName: multiPage.category.name, tagLabel, products: multiPage.products }),
        description: `Bes3 cross-checks ${multiPage.category.name} against both ${tagLabel} using teardown evidence and price-value signals.`,
        path: `/${multiPage.category.slug}/${resolved.landing}`,
        locale: getRequestLocale(),
        robots: multiPage.status === 'researching' ? { index: false, follow: true } : undefined,
        keywords: [`best ${multiPage.category.name} for ${tagLabel}`, 'multi constraint product evidence', 'Reddit consensus']
      })
    }
    return buildPageMetadata({
      title: 'Scenario Researching',
      description: 'This Bes3 scenario page is not ready yet.',
      path: `/${resolved.category}/${resolved.landing}`,
      locale: getRequestLocale(),
      robots: { index: false, follow: true }
    })
  }

  return buildPageMetadata({
    title: buildScenarioTitle({ categoryName: page.category.name, tagLabel: page.tag.name, products: page.products }),
    description: `Bes3 analyzes creator teardown evidence to rank the best ${page.category.name} for ${page.tag.name}.`,
    path: `/${page.category.slug}/best-${page.category.slug}-for-${page.tag.slug}`,
    locale: getRequestLocale(),
    robots: page.status === 'researching' ? { index: false, follow: true } : undefined,
    keywords: [`best ${page.category.name} for ${page.tag.name}`, `${page.tag.name} ${page.category.name}`, 'Reddit consensus']
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
    ? `/${page.category.slug}/best-${page.category.slug}-for-${page.tag.slug}`
    : `/${multiPage!.category.slug}/${resolved.landing}`
  const products = page ? page.products : multiPage!.products
  const tagLabel = page ? page.tag.name : multiPage!.tags.map((tag) => tag.name).join(' + ')
  const categoryName = page ? page.category.name : multiPage!.category.name
  const title = buildScenarioTitle({ categoryName, tagLabel, products })
  const bluf = buildBluf({ products, tagLabel })
  const faqEntries = [
    {
      question: page ? `Why does this page focus on ${page.tag.name}?` : 'Why combine these constraints?',
      answer: page
        ? `${page.tag.name} is treated as a canonical pain point. Products only deserve a ranking when the evidence pipeline finds real creator tests for that scenario.`
        : 'Multi-constraint pages only rank products when the same evidence graph can satisfy more than one real buying pain point.'
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
          buildFaqSchema(path, faqEntries)
        ]}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Programmatic Scenario Page</p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            {title}.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            {bluf}
          </p>
        </div>
      </section>
      <DecisionFitSection products={products} tagLabel={tagLabel} />
      <HardcoreEvidenceMatrix products={products} emptyTitle={`${title} is still below the evidence threshold.`} />
      <EvidenceStream products={products} />
      <section className="px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SeoFaqSection
            title="Scenario FAQ"
            entries={faqEntries}
            description="Each answer repeats the same evidence threshold and source-checking rules used by the JSON-LD payload."
          />
        </div>
      </section>
    </PublicShell>
  )
}
