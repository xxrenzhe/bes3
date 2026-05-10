import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PurchaseDecisionActionLink } from '@/components/commerce/PurchaseDecisionActionLink'
import { PurchaseDecisionCard } from '@/components/commerce/PurchaseDecisionCard'
import { PublicShell } from '@/components/layout/PublicShell'
import { DecisionReadinessCard } from '@/components/site/DecisionReadinessCard'
import { PriceValueBadge } from '@/components/site/PriceValueBadge'
import { PriceAlertForm } from '@/components/site/PriceAlertForm'
import { EvidenceFeedbackButtons } from '@/components/site/EvidenceFeedbackButtons'
import { PriceTrendSparkline } from '@/components/site/PriceTrendSparkline'
import { PrimaryCta } from '@/components/site/PrimaryCta'
import { StructuredData } from '@/components/site/StructuredData'
import { buildCommerceDecisionReadiness, buildEvidenceDecisionReadiness } from '@/lib/decision-readiness'
import { buildProductDecisionContent } from '@/lib/decision-content'
import { formatEditorialDate, getFreshnessLabel } from '@/lib/editorial'
import { formatHardcorePrice, getHardcoreProductBySlug, listHardcoreProducts } from '@/lib/hardcore'
import { buildIntentMetadataDescription, buildPageMetadata } from '@/lib/metadata'
import { buildCommercePurchaseDecision, buildEvidencePurchaseDecision } from '@/lib/purchase-decision'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildFaqSchema, buildProductAggregateSchema } from '@/lib/structured-data'
import {
  getBrandPolicyBySlug,
  getBrandSlug,
  getOpenCommerceProductBySlug,
  listBrandCompatibilityFacts,
  listProductAttributeFacts,
  listProductOffers,
  listProductPriceHistory
} from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function formatScore(value: number | null) {
  return value == null ? 'Researching' : `${value.toFixed(1)}/10`
}

function timestampUrl(youtubeId: string | null, seconds: number | null) {
  if (!youtubeId) return null
  return `https://www.youtube.com/watch?v=${youtubeId}${seconds ? `&t=${seconds}s` : ''}`
}

function truncateText(value: string | null | undefined, maxLength: number) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  if (!normalized || normalized.length <= maxLength) return normalized

  const sliced = normalized.slice(0, maxLength + 1)
  const lastSpace = sliced.lastIndexOf(' ')
  return `${sliced.slice(0, lastSpace > maxLength * 0.55 ? lastSpace : maxLength).trim().replace(/[.,;:]+$/g, '')}...`
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getCompactCommerceName(product: {
  brand: string | null
  productModel: string | null
  modelNumber: string | null
  productType: string | null
  category: string | null
  productName: string
}) {
  const brand = product.brand?.trim()
  const model = product.productModel?.trim() || product.modelNumber?.trim()
  const type = product.productType?.trim() || product.category?.trim()

  if (brand && model) {
    const modelAlreadyIncludesBrand = model.toLowerCase().includes(brand.toLowerCase())
    return modelAlreadyIncludesBrand ? truncateText(model, 64) : truncateText(`${brand} ${model}`, 64)
  }

  if (brand && type) return truncateText(`${brand} ${type}`, 54)
  if (brand) {
    const remainder = product.productName
      .replace(new RegExp(`^${escapeRegExp(brand)}\\b`, 'i'), '')
      .trim()
      .split(/\s+/)
      .slice(0, 5)
      .join(' ')
    return truncateText(`${brand} ${remainder}`.trim(), 58)
  }

  return truncateText(product.productName.split(/\s+/).slice(0, 8).join(' '), 64)
}

function formatBuyerRating(rating: number | null, reviewCount: number | null) {
  if (rating && reviewCount) return `${rating.toFixed(1)}/5 from ${reviewCount.toLocaleString()} reviews`
  if (rating) return `${rating.toFixed(1)}/5 buyer rating`
  if (reviewCount) return `${reviewCount.toLocaleString()} buyer reviews`
  return 'Buyer rating pending'
}

async function CommerceProductPage({ slug }: { slug: string }) {
  const product = await getOpenCommerceProductBySlug(slug)
  if (!product) notFound()

  const brandSlug = getBrandSlug(product.brand)
  const [attributeFacts, offers, priceHistory, brandPolicy, compatibilityFacts] = await Promise.all([
    listProductAttributeFacts(product.id, 12),
    listProductOffers(product.id),
    listProductPriceHistory(product.id),
    brandSlug ? getBrandPolicyBySlug(brandSlug) : Promise.resolve(null),
    brandSlug ? listBrandCompatibilityFacts(brandSlug, { category: product.category || undefined, limit: 6 }) : Promise.resolve([])
  ])
  const bestOffer = product.bestOffer || offers[0] || null
  const path = `/products/${product.slug}`
  const compactProductName = getCompactCommerceName(product)
  const currentPriceLine = formatPriceSnapshot(bestOffer?.priceAmount || product.priceAmount, bestOffer?.priceCurrency || product.priceCurrency || 'USD')
  const freshnessLine = getFreshnessLabel(product.offerLastCheckedAt || product.priceLastCheckedAt || product.updatedAt)
  const heroDescription = truncateText(
    product.description || 'Bes3 is tracking this product with offer, attribute, freshness, and store-link context.',
    190
  )
  const decisionReadiness = buildCommerceDecisionReadiness(product)
  const purchaseDecision = buildCommercePurchaseDecision(product, {
    pageType: 'product',
    trackingSource: 'product-decision-card',
    categoryHref: product.categorySlug ? `/categories/${product.categorySlug}` : '/categories',
    alternativeHref: product.categorySlug ? `/categories/${product.categorySlug}` : '/categories',
    offerId: bestOffer?.id || null,
    displayName: compactProductName,
    evidenceHref: '#decision-notes'
  })
  const isMerchantCta = purchaseDecision.primaryActionHref?.startsWith('/go/')
  const decisionModules = buildProductDecisionContent(product, 'product', {
    nextStepTitle: 'Check before checkout',
    nextStepDescription: 'Open the store only after the price, attributes, and fit notes match what you need.'
  })
  const decisionShortcuts = [
    { href: '#buy-decision', label: 'Price check', detail: purchaseDecision.stateLabel },
    { href: '#decision-notes', label: 'Review notes', detail: `${purchaseDecision.evidenceCount} signals` },
    { href: '#current-offer', label: 'Price & terms', detail: currentPriceLine },
    { href: '#product-facts', label: 'Product facts', detail: attributeFacts.length ? `${attributeFacts.length} facts` : 'Tracking' }
  ]
  const decisionPathSteps = [
    {
      step: '1',
      title: 'Confirm the fit',
      description: 'Use Review Notes to check sizing, use case, and risk flags before opening the store.',
      href: '#decision-notes'
    },
    {
      step: '2',
      title: 'Verify the offer',
      description: `Match the live store page against ${currentPriceLine}, stock, shipping, and return terms.`,
      href: '#current-offer'
    },
    {
      step: '3',
      title: 'Leave only when ready',
      description: 'Use the Bes3 store link only after the review notes and terms still match your intent.',
      href: '#buy-decision'
    }
  ]
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: product.productName, path }
  ]
  const faqEntries = [
    {
      question: `Is ${product.productName} ready to buy from this page?`,
      answer: bestOffer
        ? 'Use this page to confirm the current offer, product attributes, freshness, and store link before checkout.'
        : 'Bes3 has a product record, but no active offer is attached yet, so use it for research rather than checkout.'
    },
    {
      question: 'Does Bes3 change recommendations for affiliate commission?',
      answer: 'No. Affiliate links only make a product purchasable from Bes3. The page keeps price, review proof, and freshness signals visible so the recommendation can be checked.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildBreadcrumbSchema(path, breadcrumbItems),
          buildProductAggregateSchema({
            path,
            name: product.productName,
            description: product.description || `${product.productName} price check with offer, review notes, and buyer-fit context from Bes3.`,
            image: product.heroImageUrl,
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
            offerUrl: purchaseDecision.primaryActionHref?.startsWith('/go/') ? purchaseDecision.primaryActionHref : null,
            price: bestOffer?.priceAmount || product.priceAmount,
            priceCurrency: bestOffer?.priceCurrency || product.priceCurrency,
            availabilityStatus: bestOffer?.availabilityStatus
          }),
          buildFaqSchema(path, faqEntries)
        ]}
      />
      <section className="overflow-hidden border-b border-border bg-[radial-gradient(circle_at_top_left,#ecfdf5_0,#ffffff_38%,#f8fbff_100%)] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.96fr)_minmax(340px,0.74fr)] lg:items-start xl:grid-cols-[minmax(0,0.9fr)_minmax(260px,320px)_minmax(320px,0.58fr)]">
          <div className="space-y-6 lg:pt-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Should you buy it?</p>
              <h1 className="mt-3 max-w-4xl font-[var(--font-display)] text-4xl font-black tracking-tight text-slate-950 sm:text-6xl lg:text-6xl xl:text-7xl">
                {compactProductName}
              </h1>
              {compactProductName !== product.productName ? (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Full listing name: {product.productName}
                </p>
              ) : null}

              <div className="mt-5 rounded-[1.75rem] border border-emerald-200/80 bg-white/90 p-4 shadow-[0_22px_70px_-50px_rgba(15,23,42,0.55)] lg:hidden">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Current price</p>
                    <p className="mt-1 font-mono text-xl font-black text-foreground">{currentPriceLine}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Buyer signal</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{formatBuyerRating(product.rating, product.reviewCount)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  {isMerchantCta ? (
                    <PrimaryCta
                      href={purchaseDecision.primaryActionHref}
                      label={purchaseDecision.primaryActionLabel}
                      productId={product.id}
                      trackingSource="mobile-hero-decision"
                      trackingMetadata={{
                        ...purchaseDecision.metadata,
                        ctaVariant: `${purchaseDecision.ctaVariant}-mobile-hero`
                      }}
                      trustBadge={`${purchaseDecision.evidenceCount} review signal${purchaseDecision.evidenceCount === 1 ? '' : 's'} checked before checkout`}
                      buttonClassName="w-full"
                      showAffiliateDisclosure={false}
                    />
                  ) : (
                    <PurchaseDecisionActionLink
                      decision={purchaseDecision}
                      className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    />
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>Affiliate disclosure: Bes3 may earn from qualifying purchases.</span>
                  <a href="#decision-notes" className="font-semibold text-foreground underline-offset-4 hover:underline">Review proof</a>
                </div>
              </div>

              {heroDescription ? (
                <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                  {heroDescription}
                </p>
              ) : null}
              <div className="mt-4 hidden flex-wrap gap-3 lg:flex">
                <a href="#decision-notes" className="inline-flex min-h-[44px] items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                  Review proof
                </a>
                <a href="#current-offer" className="inline-flex min-h-[44px] items-center rounded-full border border-border bg-white/90 px-4 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                  Check offer terms
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Offer', currentPriceLine],
                ['Buyer rating', formatBuyerRating(product.rating, product.reviewCount)],
                ['Freshness', freshnessLine]
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1.25rem] border border-border/70 bg-white/80 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                  <p className="mt-2 text-sm font-black text-foreground">{value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {purchaseDecision.proofBullets.slice(0, 3).map((item) => (
                <span key={item} className="rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-sm font-semibold text-emerald-950">
                  {item}
                </span>
              ))}
            </div>

            <nav
              aria-label="Product decision shortcuts"
              data-product-ux="decision-shortcuts"
              className="rounded-[1.5rem] border border-slate-200/80 bg-white/85 p-3 shadow-[0_20px_70px_-55px_rgba(15,23,42,0.65)]"
            >
              <p className="px-1 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Decision shortcuts</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {decisionShortcuts.map((shortcut) => (
                  <a
                    key={shortcut.href}
                    href={shortcut.href}
                    className="group flex min-h-[48px] items-center justify-between gap-3 rounded-2xl border border-transparent bg-slate-50 px-3 py-2 text-sm transition hover:border-primary/30 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <span className="font-semibold text-foreground">{shortcut.label}</span>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-primary">{shortcut.detail}</span>
                  </a>
                ))}
              </div>
            </nav>

            <div data-product-ux="decision-path" className="grid grid-cols-3 gap-2 md:gap-3">
              {decisionPathSteps.map((item) => (
                <a
                  key={item.step}
                  href={item.href}
                  className="rounded-[1.25rem] border border-emerald-100 bg-white/80 p-3 text-xs shadow-[0_18px_60px_-50px_rgba(15,23,42,0.75)] transition hover:-translate-y-0.5 hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:p-4 md:text-sm"
                >
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-emerald-950 text-xs font-black text-white">{item.step}</span>
                  <span className="mt-3 block font-black text-foreground">{item.title}</span>
                  <span className="mt-2 hidden leading-6 text-muted-foreground md:block">{item.description}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-white shadow-panel lg:order-3 lg:col-span-2 xl:order-none xl:col-span-1 xl:sticky xl:top-24">
            <div className="relative aspect-[4/3] bg-[linear-gradient(135deg,#e5eeff,#dff8ea)] lg:aspect-[3/4]">
              {product.heroImageUrl ? (
                <Image
                  src={product.heroImageUrl}
                  alt={`Product image for ${compactProductName}`}
                  fill
                  sizes="(max-width: 1023px) 100vw, (max-width: 1279px) 38vw, 320px"
                  className="object-contain p-5 lg:p-6"
                />
              ) : (
                <div className="bg-grid absolute inset-0" />
              )}
              <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary shadow-sm">
                {product.category || 'Tracked product'}
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border/70 border-t border-border/70 bg-white/95 text-center text-[11px] font-bold text-slate-700">
              <div className="px-2 py-3">
                <span className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Price</span>
                {currentPriceLine}
              </div>
              <div className="px-2 py-3">
                <span className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Reviews</span>
                {product.reviewCount ? product.reviewCount.toLocaleString() : 'Pending'}
              </div>
              <div className="px-2 py-3">
                <span className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Facts</span>
                {purchaseDecision.evidenceCount}
              </div>
            </div>
          </div>

          <aside id="buy-decision" className="scroll-mt-24 flex flex-col gap-4 lg:order-2 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 xl:order-none xl:col-start-auto xl:row-start-auto">
            <PurchaseDecisionCard decision={purchaseDecision} stickyEligible compact />
          </aside>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <div id="current-offer" className="scroll-mt-24 rounded-md border border-border bg-slate-50 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Current offer</p>
            <p className="mt-4 font-mono text-5xl font-black">
              {currentPriceLine}
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {bestOffer?.merchantName ? `${bestOffer.merchantName} offer` : 'Merchant offer'} · checked {formatEditorialDate(bestOffer?.lastCheckedAt || product.offerLastCheckedAt || product.updatedAt, 'Tracking soon')}.
            </p>
            <div className="mt-5">
              <DecisionReadinessCard readiness={decisionReadiness} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="#buy-decision" className="inline-flex min-h-[44px] items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                Back to price check
              </a>
              <a href="#decision-notes" className="inline-flex min-h-[44px] items-center rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                Review proof first
              </a>
            </div>
          </div>
          <PriceTrendSparkline
            priceHistory={priceHistory}
            fallbackPrice={bestOffer?.priceAmount || product.priceAmount}
            fallbackCurrency={bestOffer?.priceCurrency || product.priceCurrency}
          />
          <div id="decision-notes" className="scroll-mt-24 rounded-md border border-border bg-white p-6 lg:col-span-2">
            <span id="review-notes" aria-hidden="true" className="block scroll-mt-24" />
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Review Notes</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {decisionModules.map((module) => (
                <article key={module.id} className="rounded-md bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{module.eyebrow}</p>
                  <h2 className="mt-2 text-lg font-black tracking-tight">{module.title}</h2>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                    {module.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>
              ))}
            </div>
            <div data-product-ux="decision-notes-cta" className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/70 p-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-900">Proof checked?</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-emerald-950">Only leave Bes3 if the live store page still matches this review.</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-emerald-900">
                    Recheck price, stock, shipping, return terms, and product variant on the merchant page before checkout.
                  </p>
                </div>
                <div className="lg:min-w-[260px]">
                  {isMerchantCta ? (
                    <PrimaryCta
                      href={purchaseDecision.primaryActionHref}
                      label={purchaseDecision.primaryActionLabel}
                      productId={product.id}
                      trackingSource="review-notes-exit"
                      trackingMetadata={{
                        ...purchaseDecision.metadata,
                        ctaVariant: `${purchaseDecision.ctaVariant}-review-notes`
                      }}
                      trustBadge={`${purchaseDecision.evidenceCount} review signal${purchaseDecision.evidenceCount === 1 ? '' : 's'} checked on this page`}
                      buttonClassName="w-full"
                      showAffiliateDisclosure={false}
                    />
                  ) : (
                    <PurchaseDecisionActionLink
                      decision={purchaseDecision}
                      className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    />
                  )}
                  <a href="#buy-decision" className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center text-sm font-semibold text-emerald-950 underline-offset-4 hover:underline">
                    Back to price check
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="product-facts" className="scroll-mt-24 border-t border-border bg-slate-50 px-4 py-14 pb-36 sm:px-6 sm:pb-14 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <div className="rounded-md border border-border bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Product Facts</p>
            <div className="mt-5 divide-y divide-border">
              {attributeFacts.length ? attributeFacts.map((fact) => (
                <div key={fact.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[0.38fr_0.62fr]">
                  <span className="font-semibold text-foreground">{fact.attributeLabel}</span>
                  <span className="text-muted-foreground">{fact.attributeValue}</span>
                </div>
              )) : (
                <p className="text-sm leading-7 text-muted-foreground">Product facts are still being enriched for this item.</p>
              )}
            </div>
          </div>
          <div className="rounded-md border border-border bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Brand Context</p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
              {brandPolicy ? (
                <>
                  {brandPolicy.shippingPolicy ? <p><span className="font-semibold text-foreground">Shipping:</span> {brandPolicy.shippingPolicy}</p> : null}
                  {brandPolicy.returnPolicy ? <p><span className="font-semibold text-foreground">Returns:</span> {brandPolicy.returnPolicy}</p> : null}
                  {brandPolicy.warrantyPolicy ? <p><span className="font-semibold text-foreground">Warranty:</span> {brandPolicy.warrantyPolicy}</p> : null}
                </>
              ) : (
                <p>Brand policy details are not verified yet.</p>
              )}
              {compatibilityFacts.slice(0, 4).map((fact) => (
                <p key={fact.id}><span className="font-semibold text-foreground">{fact.factLabel}:</span> {fact.factValue}</p>
              ))}
            </div>
          </div>
          <details className="rounded-md border border-border bg-white p-6 lg:col-span-2">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
              For verification tools
            </summary>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              Verification tools can read the same store-link check, offer, price, and product-fact payload used by this page.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={`/api/open/commerce/products/${product.id}`} className="inline-flex min-h-[44px] items-center rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary">
                Product data
              </Link>
              <Link href={`/api/open/commerce/products/${product.id}/offers`} className="inline-flex min-h-[44px] items-center rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary">
                Offer data
              </Link>
            </div>
          </details>
          <div data-product-ux="final-decision-recovery" className="rounded-[1.75rem] border border-emerald-200 bg-white p-5 shadow-[0_26px_80px_-55px_rgba(15,23,42,0.65)] lg:col-span-2 lg:p-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Finished checking the facts?</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Return to the price check before you leave Bes3.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                  Use the merchant link only if the live offer still matches this page on price, variant, stock, shipping, and return terms.
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:min-w-[280px]">
                {isMerchantCta ? (
                  <PrimaryCta
                    href={purchaseDecision.primaryActionHref}
                    label={purchaseDecision.primaryActionLabel}
                    productId={product.id}
                    trackingSource="final-decision-recovery"
                    trackingMetadata={{
                      ...purchaseDecision.metadata,
                      ctaVariant: `${purchaseDecision.ctaVariant}-final-recovery`
                    }}
                    trustBadge={`${purchaseDecision.evidenceCount} review signal${purchaseDecision.evidenceCount === 1 ? '' : 's'} and product facts checked`}
                    buttonClassName="w-full"
                    showAffiliateDisclosure={false}
                  />
                ) : (
                  <PurchaseDecisionActionLink
                    decision={purchaseDecision}
                    className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  />
                )}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <a href="#buy-decision" className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-slate-50 px-4 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                    Review price check
                  </a>
                  <a href="#current-offer" className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                    Recheck offer terms
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug
  const product = await getHardcoreProductBySlug(slug)
  if (!product) {
    const commerceProduct = await getOpenCommerceProductBySlug(slug)
    if (commerceProduct) {
      return buildPageMetadata({
        title: `Should You Buy ${commerceProduct.productName}?`,
        description: buildIntentMetadataDescription({
          title: commerceProduct.productName,
          description: commerceProduct.description || `${commerceProduct.productName} price check with offer, review notes, and buyer-fit context.`,
          pageType: 'product'
        }),
        path: `/products/${commerceProduct.slug}`,
        locale: await getRequestLocale(),
        image: commerceProduct.heroImageUrl,
        category: commerceProduct.category || undefined,
        freshnessDate: commerceProduct.updatedAt || commerceProduct.priceLastCheckedAt || commerceProduct.offerLastCheckedAt,
        keywords: [
          commerceProduct.productName,
          commerceProduct.brand || '',
          commerceProduct.category || '',
          'should you buy',
          'price check'
        ].filter(Boolean)
      })
    }

    return buildPageMetadata({
      title: 'Product Researching',
      description: 'This Bes3 product is not available in the public ratings system yet.',
      path: '/products',
      locale: await getRequestLocale(),
      robots: { index: false, follow: true }
    })
  }

  return buildPageMetadata({
    title: `${product.name} Reviewed Product Report`,
    description: `${product.name} reviewed with source proof, use-case tags, store-link health, and price timing.`,
    path: `/products/${product.slug}`,
    locale: await getRequestLocale(),
    robots: product.consensus.evidenceCount === 0 ? { index: false, follow: true } : undefined,
    image: product.imageUrl,
    category: product.categoryName,
    keywords: [product.name, product.categoryName, 'review proof', 'review score']
  })
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug
  const products = await listHardcoreProducts()
  const product = products.find((item) => item.slug === slug) || null
  if (!product) return <CommerceProductPage slug={slug} />
  const path = `/products/${product.slug}`
  const hasCommissionableExit = Boolean(
    product.affiliateUrl &&
    product.affiliateStatus !== 'out_of_stock' &&
    product.affiliateStatus !== 'broken'
  )
  const decisionReadiness = buildEvidenceDecisionReadiness(product)
  const monetizedAlternatives = hasCommissionableExit
    ? []
    : products
        .filter((item) =>
          item.id !== product.id &&
          item.categorySlug === product.categorySlug &&
          item.affiliateUrl &&
          item.affiliateStatus !== 'out_of_stock' &&
          item.affiliateStatus !== 'broken'
        )
        .slice(0, 3)
  const purchaseDecision = buildEvidencePurchaseDecision(product, {
    pageType: 'product',
    trackingSource: 'product-decision-card',
    categoryHref: `/categories/${product.categorySlug}`,
    alternativeHref: monetizedAlternatives[0]?.slug ? `/products/${monetizedAlternatives[0].slug}` : `/categories/${product.categorySlug}`,
    hasAlternatives: monetizedAlternatives.length > 0
  })
  const faqEntries = [
    {
      question: 'Why might the score still be researching?',
      answer: 'Bes3 needs exact product matching, enough review proof, use-case coverage, and trustworthy quotes before making a confident claim.'
    },
    {
      question: 'Does commission change the score?',
      answer: 'No. A store link only makes a product purchasable from the page. The score comes from review quality, quote confidence, and rating consistency.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildBreadcrumbSchema(path, [
            { name: 'Home', path: '/' },
            { name: product.categoryName, path: `/categories/${product.categorySlug}` },
            { name: product.name, path }
          ]),
          buildProductAggregateSchema({
            path,
            name: product.name,
            description: product.description || `${product.name} reviewed product report from Bes3.`,
            image: product.imageUrl,
            ratingValue: product.consensus.score5,
            reviewCount: product.consensus.evidenceCount,
            offerUrl: product.affiliateUrl ? `/go/${product.id}` : null,
            price: product.price.currentPrice,
            priceCurrency: product.price.currency,
            availabilityStatus: product.affiliateStatus
          }),
          buildFaqSchema(path, faqEntries)
        ]}
      />
      <section className="border-b border-border bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.75fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Should you buy it?</p>
            <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
              {product.brand ? `${product.brand} ` : ''}
              {product.name}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              {product.description || 'This product is in the public catalog, but the full review summary is still being built from source material.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/categories/${product.categorySlug}`} className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary">
                Back to {product.categoryName}
              </Link>
            </div>
            {!hasCommissionableExit ? (
              <div className="mt-6 max-w-3xl rounded-md border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-black text-amber-950">Review-ready, store link still missing.</p>
                <p className="mt-2 text-sm leading-7 text-amber-900">
                  Bes3 found usable review proof for this exact product, but it is not showing a purchase button because no verified store link is attached yet.
                </p>
              </div>
            ) : null}
          </div>
          <PurchaseDecisionCard decision={purchaseDecision} stickyEligible />
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="rounded-md border border-border bg-slate-50 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Current review score</p>
            <p className="mt-4 font-mono text-5xl font-black">{formatScore(product.consensus.score10)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {product.consensus.confidence} confidence from {product.consensus.evidenceCount} review report{product.consensus.evidenceCount === 1 ? '' : 's'}.
            </p>
            <div className="mt-5">
              <PriceValueBadge price={product.price} />
            </div>
            <p className="mt-4 text-xs leading-6 text-muted-foreground">
              Current {formatHardcorePrice(product.price.currentPrice, product.price.currency)} | Historical low{' '}
              {formatHardcorePrice(product.price.histLowPrice, product.price.currency)} | 90-day avg{' '}
              {formatHardcorePrice(product.price.avg90dPrice, product.price.currency)}
            </p>
            <PriceAlertForm
              productId={product.id}
              targetPrice={product.price.histLowPrice}
              targetValueScore={product.price.valueScore}
            />
            <div className="mt-5">
              <DecisionReadinessCard readiness={decisionReadiness} />
            </div>
          </div>
          <div>
            {!hasCommissionableExit ? (
              <div className="mt-5 rounded-md border border-border bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Buying path</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  No outbound store link is available for this item until a real merchant URL is verified.
                </p>
                {monetizedAlternatives.length ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-semibold">Commissionable alternatives in {product.categoryName}</p>
                    {monetizedAlternatives.map((alternative) => {
                      const alternativeDecision = buildEvidencePurchaseDecision(alternative, {
                        pageType: 'product',
                        trackingSource: 'product-decision-card',
                        categoryHref: `/categories/${alternative.categorySlug}`,
                        alternativeHref: `/categories/${alternative.categorySlug}`,
                        userIntent: `alternative for ${product.name}`
                      })
                      const alternativeMerchantHref = alternativeDecision.primaryActionHref?.startsWith('/go/')
                        ? alternativeDecision.primaryActionHref
                        : null

                      return (
                      <div key={alternative.id} className="rounded-md bg-slate-50 p-3">
                        <Link href={`/products/${alternative.slug}`} className="block text-sm font-semibold text-foreground hover:text-primary">
                          {alternative.brand ? `${alternative.brand} ` : ''}{alternative.name}
                        </Link>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatScore(alternative.consensus.score10)}</span>
                          <span>{alternative.consensus.evidenceCount} review report{alternative.consensus.evidenceCount === 1 ? '' : 's'}</span>
                          {alternativeMerchantHref ? (
                            <a href={alternativeMerchantHref} className="font-semibold text-primary hover:underline">
                              {alternativeDecision.primaryActionLabel}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    )})}
                  </div>
                ) : (
                  <Link href={`/categories/${product.categorySlug}`} className="mt-4 inline-flex rounded-md border border-border px-3 py-2 text-sm font-semibold hover:border-primary hover:text-primary">
                    Browse category research
                  </Link>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Review Proof</p>
          <h2 className="mt-3 max-w-4xl font-[var(--font-display)] text-4xl font-black tracking-tight">
            What creators actually tested.
          </h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {product.evidence.length ? (
              product.evidence.map((report) => {
                const url = timestampUrl(report.youtubeId, report.timestampSeconds)
                return (
                  <article key={report.id} className="rounded-md border border-border bg-white p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white">{report.rating}</span>
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900">{report.tagName}</span>
                      {report.isAdvertorial ? <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">Sponsored-source warning</span> : null}
                    </div>
                    <blockquote className="mt-4 border-l-2 border-primary pl-4 text-sm leading-7 text-muted-foreground">{report.evidenceQuote}</blockquote>
                    {report.contextSnippet ? <p className="mt-3 text-xs leading-6 text-muted-foreground">Context: {report.contextSnippet}</p> : null}
                    <p className="mt-4 text-sm font-semibold">
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          Review by {report.channelName}
                        </a>
                      ) : (
                        `Review by ${report.channelName}`
                      )}
                    </p>
                    <EvidenceFeedbackButtons analysisReportId={report.id} />
                  </article>
                )
              })
            ) : (
              <div className="rounded-md border border-border bg-white p-6">
                <p className="font-semibold">No review quote has cleared validation yet.</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  A product page can exist before the score is ready. Bes3 keeps it visible but blocks false winner claims until review proof is attached.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
