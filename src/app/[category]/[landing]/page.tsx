import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PurchaseDecisionCard } from '@/components/commerce/PurchaseDecisionCard'
import { PublicShell } from '@/components/layout/PublicShell'
import { HardcoreEvidenceMatrix } from '@/components/site/HardcoreEvidenceMatrix'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { StructuredData } from '@/components/site/StructuredData'
import { getMultiConstraintLandingPage, getScenarioLandingPage, listHardcoreTags } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { buildScenarioPseoPath, buildValuePseoPath, getScenarioPseoStaticParams } from '@/lib/pseo'
import { buildEvidencePurchaseDecision } from '@/lib/purchase-decision'
import { getScenarioIndexEligibility } from '@/lib/recommendation-quality'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildProductAggregateSchema } from '@/lib/structured-data'
import type { HardcoreProduct } from '@/lib/hardcore'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
  return getScenarioIndexEligibility(status, products).indexable
}

function buyerCategoryName(categorySlug: string, categoryName: string, tagLabel: string) {
  if (categorySlug === 'yard-pool-automation' && /pool/i.test(tagLabel)) return 'Pool Robots'
  return categoryName
}

function currentPick(products: HardcoreProduct[]) {
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

function buildScenarioTitle({
  categorySlug,
  categoryName,
  tagLabel,
  products,
  status
}: {
  categorySlug: string
  categoryName: string
  tagLabel: string
  products: HardcoreProduct[]
  status?: string | null
}) {
  const count = Math.max(testedProductCount(products), 1)
  const buyerName = buyerCategoryName(categorySlug, categoryName, tagLabel)
  if (!isLiveScenario(status, products)) {
    if (!currentPick(products)) {
      return `Best ${buyerName} for ${tagLabel}: Evidence Still Researching`
    }
    return `Best ${buyerName} for ${tagLabel}: Current Review-Backed Pick`
  }
  return `Best ${buyerName} for ${tagLabel}: ${count} Evidence-Checked Picks`
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
  const winner = currentPick(products)
  const proof = winner?.consensus.bestQuote || winner?.evidence[0]

  if (!winner || !tested || !isLiveScenario(status, products)) {
    if (!winner || !tested) {
      return `Short answer: Bes3 has not found a public, model-safe YouTube review match for ${tagLabel} yet. This page stays in research mode and should be used to monitor the review gap, not to buy a claimed winner.`
    }
    const proofText = proof?.evidenceQuote ? ` The source proof says: "${proof.evidenceQuote}"` : ''
    return `Short answer: ${productDisplayName(winner)} is the current review-backed pick for ${tagLabel}. Bes3 has ${evidenceCount} timestamped YouTube review report${evidenceCount === 1 ? '' : 's'} across ${tested} matching product${tested === 1 ? '' : 's'}, so use this as a practical shortlist recommendation with a clear coverage warning, not as a fully ranked category winner.${proofText}`
  }

  return `Short answer: Bes3 checked ${evidenceCount} creator review reports across ${tested} tested products for ${tagLabel}. ${productDisplayName(winner)} is currently the strongest review-backed pick${proof ? ` because reviewers found: "${proof.evidenceQuote}"` : ''}.`
}

function buildAiRecommendationSummary({
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
  const pick = currentPick(products)
  const proof = pick?.consensus.bestQuote || pick?.evidence[0]
  const tested = testedProductCount(products)
  const isResearching = !isLiveScenario(status, products)
  if (!pick) {
    return {
      pick: null,
      summary: `Bes3 is still collecting source-backed review proof before naming a ${categoryName} pick for ${tagLabel}.`,
      bullets: [
        'Use this page to monitor products that gain timestamped, model-safe creator reviews.',
        'Do not buy from this page until at least one product has a verified source quote for the exact product.',
        'Check category and product pages for broader alternatives with stronger review proof.'
      ]
    }
  }

  return {
    pick,
    summary: isResearching
      ? `For buyers asking what to try first for ${tagLabel}, Bes3 would shortlist ${productDisplayName(pick)} because it has direct review proof for the exact wall-climbing claim. Coverage is limited because the page has ${tested} independently reviewed product${tested === 1 ? '' : 's'}, below the 3-product mark for a fuller guide.`
      : `For ${tagLabel}, Bes3 currently recommends ${productDisplayName(pick)} as the leading review-checked option based on creator proof, review score, and price-value context.`,
    bullets: [
      proof ? `Why it is recommended: ${proof.evidenceQuote}` : `${pick.name} has the strongest matched review proof on this page.`,
      pick.price.entryStatus === 'best-deal' || pick.price.entryStatus === 'great-value'
        ? `Buy-window signal: ${pick.price.label}.`
        : `Price signal: ${pick.price.label}; verify the current price before buying.`,
      isResearching
        ? 'Coverage limit: treat this as the best current shortlist item, not a definitive market-wide winner.'
        : 'Coverage limit: still verify the source quotes against your pool and surface type.'
    ]
  }
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
  const strongest = currentPick(products)
  const bestQuote = strongest?.consensus.bestQuote || strongest?.evidence[0] || null
  const hasDealSignal = strongest?.price.entryStatus === 'best-deal' || strongest?.price.entryStatus === 'great-value'
  const isResearching = !strongest || tested < 3

  return {
    strongest,
    isResearching,
    buySignals: [
      tested >= 3
        ? `${tested} products have usable creator proof for ${tagLabel}.`
        : `${strongest ? productDisplayName(strongest) : 'The current pick'} is usable as a shortlist pick because it has matched review proof for ${tagLabel}.`,
      strongest?.consensus.score10 != null
        ? isResearching
          ? `${productDisplayName(strongest)} has a ${strongest.consensus.score10.toFixed(1)}/10 review score from the matched creator proof.`
          : `${productDisplayName(strongest)} leads with a ${strongest.consensus.score10.toFixed(1)}/10 review score.`
        : 'Review scoring is still waiting for more aligned proof.',
      hasDealSignal
        ? `${productDisplayName(strongest!)} has a ${strongest!.price.label.toLowerCase()} signal.`
        : strongest
          ? `${productDisplayName(strongest)} does not yet have a strong buy-window signal.`
          : 'Price-value timing is still unavailable.'
    ],
    skipSignals: [
      isResearching
        ? 'Do not treat this as a full category ranking until at least three products have useful review proof.'
        : 'Skip products with no timestamped quote, even if their specs look strong.',
      strongest?.consensus.controversy
        ? `${productDisplayName(strongest)} has contradictory creator proof, so read the proof before buying.`
        : isResearching
          ? 'Do not assume one matched source covers every pool surface, waterline, or debris condition.'
          : 'Skip the winner claim if the review stream does not match your exact use case.',
      strongest?.affiliateStatus === 'out_of_stock'
        ? `${productDisplayName(strongest)} is out of stock, so use the alternatives path instead of forcing the top pick.`
        : 'Skip buying immediately when the price window is normal or overpriced.'
    ],
    proof: bestQuote
  }
}

function DecisionFitSection({ products, tagLabel }: { products: HardcoreProduct[]; tagLabel: string }) {
  const decision = buildDecisionFit(products, tagLabel)
  const heading = decision.isResearching
    ? 'Use this as a shortlist, not a fake top-10.'
    : 'Who should act on this page, and who should wait.'
  const intro = decision.isResearching
    ? decision.strongest
      ? `For ${tagLabel}, the current data is strong enough to name a practical review-backed starting point and too thin to pretend the whole market has been ranked. The useful check is whether the quoted proof matches your exact use case and model expectations.`
      : `For ${tagLabel}, Bes3 is still missing a public, model-safe review match. The useful check is to wait for verified source proof instead of trusting a thin or mismatched claim.`
    : `This summary converts review count, review score, creator proof, and price-value timing into a direct buying check for ${tagLabel}.`

  return (
    <section className="border-y border-border bg-slate-950 px-4 py-14 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">
            {decision.isResearching ? 'Recommendation Guardrails' : 'Decision Fit'}
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

function AiRecommendationBox({
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
  const ai = buildAiRecommendationSummary({ categoryName, tagLabel, products, status })
  return (
    <section className="px-4 pb-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-700">Quick Shopping Summary</p>
        <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
          {ai.pick ? `Recommend ${productDisplayName(ai.pick)} first for ${tagLabel}.` : `No recommendation yet for ${tagLabel}.`}
        </h2>
        <p className="mt-4 max-w-4xl text-base leading-8 text-emerald-950/80">{ai.summary}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {ai.bullets.map((bullet) => (
            <p key={bullet} className="rounded-2xl bg-white/80 p-4 text-sm font-medium leading-7 text-emerald-950">
              {bullet}
            </p>
          ))}
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
    { href: '/products', label: 'Reviewed products' },
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
        title: buildScenarioTitle({ categorySlug: multiPage.category.slug, categoryName: multiPage.category.name, tagLabel, products: multiPage.products, status: multiPage.status }),
        description: isResearching
          ? `Current review-backed pick for ${multiPage.category.name} and ${tagLabel}: what to buy first, why it is recommended, and where coverage is still limited.`
          : `Bes3 cross-checks ${multiPage.category.name} against both ${tagLabel} using review proof and price-value signals.`,
        path: `/${multiPage.category.slug}/${resolved.landing}`,
        locale: await getRequestLocale(),
        robots: isResearching ? { index: false, follow: true } : undefined,
        keywords: [`best ${multiPage.category.name} for ${tagLabel}`, `${multiPage.category.name} ${tagLabel} recommendation`, 'YouTube review proof']
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
    title: buildScenarioTitle({ categorySlug: page.category.slug, categoryName: page.category.name, tagLabel: page.tag.name, products: page.products, status: page.status }),
    description: isResearching
      ? `Current review-backed pick for ${page.tag.name}: what to buy first, why it is recommended, and where coverage is still limited.`
      : `Bes3 analyzes creator review proof to rank the best ${page.category.name} for ${page.tag.name}.`,
    path: buildScenarioPseoPath(page.category.slug, page.tag.slug),
    locale: await getRequestLocale(),
    robots: isResearching ? { index: false, follow: true } : undefined,
    keywords: [`best ${buyerCategoryName(page.category.slug, page.category.name, page.tag.name)} for ${page.tag.name}`, `${page.tag.name} recommendation`, 'YouTube review proof']
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
  const qualityGate = getScenarioIndexEligibility(status, products)
  const isResearching = !qualityGate.indexable
  const valuePath = buildValuePseoPath(categorySlug, 500)
  const title = buildScenarioTitle({ categorySlug, categoryName, tagLabel, products, status })
  const bluf = buildBluf({ products, tagLabel, status })
  const recommended = currentPick(products)
  const topDecisions = products.slice(0, 3).map((product, index) =>
    buildEvidencePurchaseDecision(product, {
      pageType: 'scenario',
      trackingSource: 'scenario-decision-card',
      categoryHref: `/categories/${categorySlug}`,
      alternativeHref: `/categories/${categorySlug}`,
      hasAlternatives: index > 0 || products.length > 1,
      userIntent: tagLabel
    })
  )
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
            ? `${page.tag.name} is a core buyer need. Bes3 names the current review-backed shortlist pick now, while clearly marking that the review set is still below a full ranking.`
            : 'This page checks whether one product can satisfy multiple buyer constraints and names the current review-backed shortlist pick while more matching proof is collected.'
        },
        {
          question: 'Can I use this as a recommendation?',
          answer: 'Yes, use it as the current shortlist recommendation. Bes3 requires at least three independently reviewed products before calling it a complete ranked guide.'
        },
        {
          question: page ? `What can I verify for ${page.tag.name}?` : 'What can I verify here?',
          answer: page
            ? `You can verify the recommended product, ${page.tag.name} quote, source link, review score, price window, and review count before deciding whether the claim fits your pool.`
            : 'You can verify the matched quotes, source links, review scores, price windows, and which constraints still need more proof.'
        }
      ]
    : [
        {
          question: page ? `Why does this page focus on ${page.tag.name}?` : 'Why combine these constraints?',
          answer: page
            ? `${page.tag.name} is treated as a core buyer need. Products only deserve a ranking when Bes3 finds real review coverage for that use case.`
            : 'Multi-constraint pages only rank products when the same body of review proof supports more than one real buyer need.'
        },
        {
          question: 'Why can this page show researching instead of a winner?',
          answer: 'The rule is no fabricated winners. A scenario page needs at least three products with useful review proof before it becomes a live recommendation guide.'
        },
        {
          question: page ? `How does Bes3 prove the ${page.tag.name} ranking?` : 'How does Bes3 prove a multi-constraint ranking?',
          answer: page
            ? `The page keeps creator quotes, timestamp links, review scores, and price-value timing together so the ${page.tag.name} recommendation can be checked against source proof.`
            : 'The page only promotes products when creator reviews cover the required constraints, then keeps the quotes, timestamps, review scores, and price timing visible for verification.'
        }
      ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildCollectionPageSchema({
            path,
            title,
            description: recommended
              ? `${productDisplayName(recommended)} is the current review-backed pick for ${tagLabel}, with timestamped creator proof and price context.`
              : `Use-case guide for ${page ? page.category.name : multiPage!.category.name}.`,
            about: [
              { '@type': 'Thing', name: categoryName },
              { '@type': 'Thing', name: tagLabel },
              { '@type': 'Thing', name: 'YouTube review proof' }
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
              description: `${product.name} ranked with creator review proof, scenario ratings, and price-value timing for ${title}.`,
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
            {isResearching ? 'Current Recommendation' : 'Evidence-Checked Buying Guide'}
          </p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            {title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            <strong className="font-semibold text-foreground">Quick answer:</strong> {bluf}
          </p>
          {isResearching ? (
            <div className="mt-8 grid gap-4 text-sm leading-7 text-muted-foreground md:grid-cols-3">
              <div className="rounded-md border border-border bg-white p-4">
                <p className="font-semibold text-foreground">Current review proof</p>
                <p className="mt-2">{testedProductCount(products)} product{testedProductCount(products) === 1 ? '' : 's'} with usable creator proof. {recommended ? `${productDisplayName(recommended)} is the current shortlist pick.` : ''}</p>
              </div>
              <div className="rounded-md border border-border bg-white p-4">
                <p className="font-semibold text-foreground">Coverage limit</p>
                <p className="mt-2">Needs 3 products with usable store paths, 3 timestamped review reports, 3 independent sources, and price context before this becomes a fuller ranked guide.</p>
              </div>
              <div className="rounded-md border border-border bg-white p-4">
                <p className="font-semibold text-foreground">How to use it</p>
                <p className="mt-2">Use the current pick as a shortlist, then check the quote, timestamp, and price window before buying.</p>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 md:col-span-3">
                <p className="font-semibold text-amber-950">Why this page is still limited</p>
                <p className="mt-2 text-amber-900">
                  Current coverage: {qualityGate.metrics.eligibleProducts}/3 usable products, {qualityGate.metrics.totalEvidenceReports}/3 timestamped reports, {qualityGate.metrics.uniqueSources}/3 independent sources, {qualityGate.metrics.productsWithPriceContext}/3 price-context products. Still missing: {qualityGate.reasons.join(', ') || 'none'}.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>
      {topDecisions.length ? (
        <section className="border-y border-border bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Top checked picks for this use case</p>
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {topDecisions.map((decision) => (
                <PurchaseDecisionCard key={decision.productId} decision={decision} className="h-full" />
              ))}
            </div>
          </div>
        </section>
      ) : null}
      <AiRecommendationBox categoryName={categoryName} tagLabel={tagLabel} products={products} status={status} />
      <DecisionFitSection products={products} tagLabel={tagLabel} />
      <HardcoreEvidenceMatrix products={products} emptyTitle={`${title} is still below the review coverage mark.`} isResearching={isResearching} />
      <EvidenceStream products={products} isResearching={isResearching} />
      <section className="px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SeoFaqSection
            title={isResearching ? 'Recommendation FAQ' : 'Scenario FAQ'}
            entries={faqEntries}
            description={isResearching ? 'These answers explain how to use the current shortlist recommendation without over-trusting a small review set.' : 'Each answer repeats the same review coverage and source-checking rules used on this page.'}
          />
        </div>
      </section>
      <RelatedPseoLinks categorySlug={categorySlug} categoryName={categoryName} valuePath={valuePath} tagLabel={tagLabel} />
    </PublicShell>
  )
}
