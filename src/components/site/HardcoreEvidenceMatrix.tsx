import Link from 'next/link'
import { PurchaseDecisionActionLink } from '@/components/commerce/PurchaseDecisionActionLink'
import { PriceValueBadge } from '@/components/site/PriceValueBadge'
import { formatHardcorePrice, type HardcoreProduct } from '@/lib/hardcore'
import { buildEvidencePurchaseDecision } from '@/lib/purchase-decision'

function formatScore(value: number | null) {
  return value == null ? 'Researching' : `${value.toFixed(1)}/10`
}

function youtubeTimestampUrl(product: HardcoreProduct) {
  const report = product.consensus.bestQuote || product.evidence[0]
  if (!report?.youtubeId) return null
  const seconds = report.timestampSeconds || 0
  return `https://www.youtube.com/watch?v=${report.youtubeId}${seconds > 0 ? `&t=${seconds}s` : ''}`
}

function canBuy(status: string | null) {
  return !status || status === 'active' || status === 'unknown'
}

function findAlternativeProduct(products: HardcoreProduct[], current: HardcoreProduct) {
  const currentTags = new Set(current.evidence.map((report) => report.tagSlug))
  return products
    .filter((product) => product.id !== current.id && product.affiliateUrl && canBuy(product.affiliateStatus))
    .map((product) => {
      const sharedEvidence = product.evidence.filter((report) => currentTags.has(report.tagSlug)).length
      return { product, sharedEvidence }
    })
    .sort((left, right) => {
      const sharedDelta = right.sharedEvidence - left.sharedEvidence
      if (sharedDelta) return sharedDelta
      return (right.product.consensus.score10 || 0) - (left.product.consensus.score10 || 0)
    })[0]?.product || null
}

export function HardcoreEvidenceMatrix({
  products,
  emptyTitle = 'We are still collecting enough verified reviews for this category.',
  isResearching = false
}: {
  products: HardcoreProduct[]
  emptyTitle?: string
  isResearching?: boolean
}) {
  if (!products.length) {
    return (
      <section id="consensus-matrix" className="scroll-mt-24 border-y border-border bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Researching</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">{emptyTitle}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
            Bes3 refuses to fabricate winners. This page waits until product matching, review evidence, store availability, and price baselines are all in place.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section id="consensus-matrix" className="scroll-mt-24 border-y border-border bg-white px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">
            {isResearching ? 'Evidence Matrix' : 'Consensus Matrix'}
          </p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">
            {isResearching
              ? 'Why this is the current shortlist pick, and what still needs proof.'
              : 'Real-world evidence, price timing, and the current winner in one table.'}
          </h2>
          {isResearching ? (
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Use this table to verify the current recommendation against creator proof, source depth, and price context. The confidence warning stays visible because the page has not reached the full ranked-guide threshold.
            </p>
          ) : null}
        </div>
        <div className="grid gap-4 md:hidden">
          {products.map((product) => {
            const timestampUrl = youtubeTimestampUrl(product)
            const report = product.consensus.bestQuote || product.evidence[0]
            const alternative = product.affiliateStatus === 'out_of_stock' ? findAlternativeProduct(products, product) : null
            const purchaseDecision = buildEvidencePurchaseDecision(product, {
              pageType: 'matrix',
              trackingSource: 'matrix-row-cta',
              categoryHref: `/categories/${product.categorySlug}`,
              alternativeHref: alternative?.slug ? `/products/${alternative.slug}` : `/categories/${product.categorySlug}`,
              hasAlternatives: Boolean(alternative),
              userIntent: `${product.categoryName} evidence matrix`
            })
            const matrixActionHref = purchaseDecision.primaryActionHref
            return (
              <article key={product.id} className="rounded-[1.5rem] border border-border/70 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/products/${product.slug}`} className="text-lg font-black text-foreground hover:text-primary">
                      {product.brand ? `${product.brand} ` : ''}
                      {product.name}
                    </Link>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{product.categoryName}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950 px-3 py-2 text-right text-white">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                      {isResearching ? 'Source Score' : 'Consensus'}
                    </p>
                    <p className="font-mono text-lg font-black">{formatScore(product.consensus.score10)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl bg-muted/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Evidence</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {product.consensus.evidenceCount} reports · {product.consensus.sourceCount} creator sources
                    </p>
                  </div>
                  <div className="rounded-2xl bg-muted/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Price / Value</p>
                    <div className="mt-2">
                      <PriceValueBadge price={product.price} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Low {formatHardcorePrice(product.price.histLowPrice, product.price.currency)} | 90d avg{' '}
                      {formatHardcorePrice(product.price.avg90dPrice, product.price.currency)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-muted/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      {isResearching ? 'Source Proof' : 'Hardcore Proof'}
                    </p>
                    {report ? (
                      <blockquote className="mt-2 border-l-2 border-primary pl-3 text-xs leading-6 text-muted-foreground">
                        {report.evidenceQuote}
                        <span className="mt-2 block font-semibold text-foreground">
                          {timestampUrl ? (
                            <a href={timestampUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              Review by {report.channelName}
                            </a>
                          ) : (
                            `Review by ${report.channelName}`
                          )}
                        </span>
                      </blockquote>
                    ) : (
                      <p className="mt-2 text-xs leading-6 text-muted-foreground">No verified quote yet. Product stays out of winner claims.</p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  {matrixActionHref && product.affiliateUrl && canBuy(product.affiliateStatus) ? (
                    <PurchaseDecisionActionLink
                      decision={purchaseDecision}
                      className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
                    />
                  ) : product.affiliateStatus === 'out_of_stock' ? (
                    <div className="space-y-2">
                      <span className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900">
                        Currently Out of Stock
                      </span>
                      {alternative ? (
                        <Link href={`/products/${alternative.slug}`} className="block text-center text-xs font-semibold text-primary hover:underline">
                          Check alternatives: {alternative.name}
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    <span className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border px-4 text-sm font-semibold text-muted-foreground">
                      Link pending
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <th className="py-4 pr-6">Model</th>
                <th className="px-4 py-4">{isResearching ? 'Source Score' : 'Consensus'}</th>
                <th className="px-4 py-4">Evidence</th>
                <th className="px-4 py-4">Price/Value</th>
                <th className="px-4 py-4">{isResearching ? 'Source Proof' : 'Hardcore Proof'}</th>
                <th className="py-4 pl-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const timestampUrl = youtubeTimestampUrl(product)
                const report = product.consensus.bestQuote || product.evidence[0]
                const alternative = product.affiliateStatus === 'out_of_stock' ? findAlternativeProduct(products, product) : null
                const purchaseDecision = buildEvidencePurchaseDecision(product, {
                  pageType: 'matrix',
                  trackingSource: 'matrix-row-cta',
                  categoryHref: `/categories/${product.categorySlug}`,
                  alternativeHref: alternative?.slug ? `/products/${alternative.slug}` : `/categories/${product.categorySlug}`,
                  hasAlternatives: Boolean(alternative),
                  userIntent: `${product.categoryName} evidence matrix`
                })
                const matrixActionHref = purchaseDecision.primaryActionHref
                return (
                  <tr key={product.id} className="border-b border-border/70 align-top">
                    <td className="py-5 pr-6">
                      <Link href={`/products/${product.slug}`} className="font-semibold text-foreground hover:text-primary">
                        {product.brand ? `${product.brand} ` : ''}
                        {product.name}
                      </Link>
                      <p className="mt-2 text-xs text-muted-foreground">{product.categoryName}</p>
                    </td>
                    <td className="px-4 py-5">
                      <div className="font-mono text-lg font-black">{formatScore(product.consensus.score10)}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{product.consensus.confidence} confidence</p>
                      {product.consensus.badge ? (
                        <p className="mt-2 inline-flex rounded-md bg-slate-950 px-2 py-1 text-[11px] font-semibold text-white">
                          {product.consensus.badge}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-5">
                      <p className="font-semibold">{product.consensus.evidenceCount} reports</p>
                      <p className="mt-1 text-xs text-muted-foreground">{product.consensus.sourceCount} creator sources</p>
                    </td>
                    <td className="px-4 py-5">
                      <PriceValueBadge price={product.price} />
                      <p className="mt-2 text-xs text-muted-foreground">
                        Low {formatHardcorePrice(product.price.histLowPrice, product.price.currency)} | 90d avg{' '}
                        {formatHardcorePrice(product.price.avg90dPrice, product.price.currency)}
                      </p>
                    </td>
                    <td className="px-4 py-5">
                      {report ? (
                        <div className="space-y-3">
                          <blockquote className="max-w-xs border-l-2 border-primary pl-3 text-xs leading-6 text-muted-foreground">
                            {report.evidenceQuote}
                            <span className="mt-2 block font-semibold text-foreground">
                              {timestampUrl ? (
                                <a href={timestampUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                  Review by {report.channelName}
                                </a>
                              ) : (
                                `Review by ${report.channelName}`
                              )}
                            </span>
                          </blockquote>
                          {product.consensus.controversy && product.consensus.worstQuote ? (
                            <blockquote className="max-w-xs border-l-2 border-amber-500 pl-3 text-xs leading-6 text-muted-foreground">
                              {product.consensus.worstQuote.evidenceQuote}
                              <span className="mt-2 block font-semibold text-foreground">
                                Contradiction from {product.consensus.worstQuote.channelName}
                              </span>
                            </blockquote>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-xs leading-6 text-muted-foreground">No verified quote yet. Product stays out of winner claims.</p>
                      )}
                    </td>
                    <td className="py-5 pl-4">
                      {matrixActionHref && product.affiliateUrl && canBuy(product.affiliateStatus) ? (
                        <PurchaseDecisionActionLink
                          decision={purchaseDecision}
                          className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                        />
                      ) : product.affiliateStatus === 'out_of_stock' ? (
                        <div className="max-w-[220px] space-y-2">
                          <span className="inline-flex rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">
                            Currently Out of Stock
                          </span>
                          {alternative ? (
                            <Link href={`/products/${alternative.slug}`} className="block text-xs font-semibold text-primary hover:underline">
                              Check alternatives: {alternative.name}
                            </Link>
                          ) : (
                            <span className="block text-xs font-semibold text-muted-foreground">Check Alternatives when another verified pick is available.</span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex rounded-md border border-border px-4 py-2 text-sm font-semibold text-muted-foreground">
                          Link pending
                        </span>
                      )}
                      <p className="mt-2 text-[11px] text-muted-foreground">(Affiliate Link)</p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
