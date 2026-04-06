import { formatEditorialDate } from '@/lib/editorial'
import type { BrandPolicyRecord, CompatibilityFactRecord } from '@/lib/site-data'

function formatScore(value: number | null | undefined) {
  return `${Math.round(Number(value || 0) * 100)}%`
}

const POLICY_FIELDS: Array<{
  key: keyof Pick<BrandPolicyRecord, 'shippingPolicy' | 'returnPolicy' | 'warrantyPolicy' | 'discountWindow' | 'supportPolicy'>
  label: string
}> = [
  { key: 'shippingPolicy', label: 'Shipping' },
  { key: 'returnPolicy', label: 'Returns' },
  { key: 'warrantyPolicy', label: 'Warranty' },
  { key: 'discountWindow', label: 'Discount windows' },
  { key: 'supportPolicy', label: 'Support' }
]

export function BrandPolicyPanel({
  brandName,
  policy,
  compatibilityFacts,
  title = 'Shipping, returns, and warranty',
  description = 'These notes help answer the questions product specs alone cannot settle: shipping, returns, warranty, support, and fit.',
  compact = false
}: {
  brandName: string
  policy: BrandPolicyRecord | null
  compatibilityFacts: CompatibilityFactRecord[]
  title?: string
  description?: string
  compact?: boolean
}) {
  if (!policy && !compatibilityFacts.length) return null

  const visibleFacts = compatibilityFacts.slice(0, compact ? 3 : 5)
  const visiblePolicies = POLICY_FIELDS.filter((field) => Boolean(policy?.[field.key]))

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-panel sm:p-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">{title}</p>
      <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">
        {brandName} after-you-buy details
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>

      {policy ? (
        <div className={`mt-6 grid gap-4 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          <div className="rounded-[1.5rem] bg-muted p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Last verified</p>
            <p className="mt-2 text-lg font-black text-foreground">{formatEditorialDate(policy.lastVerifiedAt, 'Policy pending')}</p>
            <p className="mt-2 text-xs text-muted-foreground">{policy.sourceType} source</p>
          </div>
          <div className="rounded-[1.5rem] bg-muted p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">How much we confirmed</p>
            <p className="mt-2 text-lg font-black text-foreground">{formatScore(policy.confidenceScore)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Use merchant checkout and support pages as the final confirmation step.</p>
          </div>
          <div className="rounded-[1.5rem] bg-muted p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Fit notes</p>
            <p className="mt-2 text-lg font-black text-foreground">{compatibilityFacts.length}</p>
            <p className="mt-2 text-xs text-muted-foreground">Extra notes about setup, accessories, and real-world fit.</p>
          </div>
        </div>
      ) : null}

      <div className={`mt-6 grid gap-6 ${compact ? 'lg:grid-cols-1' : 'lg:grid-cols-[1.1fr_0.9fr]'}`}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Store policies</p>
          <div className="mt-4 space-y-3">
            {visiblePolicies.length ? visiblePolicies.map((field) => (
              <div key={field.key} className="rounded-[1.25rem] bg-muted px-4 py-4">
                <p className="text-sm font-semibold text-foreground">{field.label}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{policy?.[field.key]}</p>
              </div>
            )) : (
              <div className="rounded-[1.25rem] bg-muted px-4 py-4 text-sm text-muted-foreground">
                No brand policy details have been saved yet.
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Fit and setup notes</p>
          <div className="mt-4 space-y-3">
            {visibleFacts.length ? visibleFacts.map((fact) => (
              <div key={fact.id} className="rounded-[1.25rem] bg-muted px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-semibold text-foreground">{fact.factLabel}</p>
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {fact.isVerified ? 'verified' : fact.sourceType}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{fact.factValue}</p>
              </div>
            )) : (
              <div className="rounded-[1.25rem] bg-muted px-4 py-4 text-sm text-muted-foreground">
                No fit or setup notes are stored yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
