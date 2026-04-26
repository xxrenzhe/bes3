import Link from 'next/link'
import { PriceValueBadge } from '@/components/site/PriceValueBadge'
import { formatHardcorePrice, type HardcoreProduct } from '@/lib/hardcore'

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

export function HardcoreEvidenceMatrix({
  products,
  emptyTitle = 'Evidence matrix is still researching this lane.'
}: {
  products: HardcoreProduct[]
  emptyTitle?: string
}) {
  if (!products.length) {
    return (
      <section className="border-y border-border bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Researching</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">{emptyTitle}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
            V2 refuses to fabricate winners. This page waits until the pipeline has aligned products, creator evidence, affiliate links, and price baselines.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="border-y border-border bg-white px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Consensus Matrix</p>
          <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight">
            Real-world evidence, price timing, and the current winner in one table.
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <th className="py-4 pr-6">Model</th>
                <th className="px-4 py-4">Consensus</th>
                <th className="px-4 py-4">Evidence</th>
                <th className="px-4 py-4">Price/Value</th>
                <th className="px-4 py-4">Hardcore Proof</th>
                <th className="py-4 pl-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const timestampUrl = youtubeTimestampUrl(product)
                const report = product.consensus.bestQuote || product.evidence[0]
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
                      {product.affiliateUrl && canBuy(product.affiliateStatus) ? (
                        <a
                          href={`/go/${product.id}`}
                          className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                        >
                          Check price
                        </a>
                      ) : product.affiliateStatus === 'out_of_stock' ? (
                        <span className="inline-flex max-w-[180px] rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">
                          Currently Out of Stock
                        </span>
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
