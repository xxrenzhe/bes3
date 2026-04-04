import { PublicShell } from '@/components/layout/PublicShell'

export default function TermsPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-fit rounded-full bg-white/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary shadow-panel">
          Legal Framework
        </div>
        <div className="mt-8 editorial-prose">
          <p>Last Updated: April 3, 2026</p>
          <h1>Terms of Service</h1>
          <p>Bes3 provides informational buying guidance and affiliate links. Product pricing, stock, and merchant terms can change without notice.</p>
          <h2>Content use</h2>
          <ul>
            <li>Bes3 pages are provided for informational use only.</li>
            <li>Bes3 may earn commissions from qualifying purchases.</li>
            <li>We aim for accuracy, but source merchants remain authoritative for final pricing and availability.</li>
          </ul>
          <h2>Affiliate disclosure</h2>
          <p>Some links on Bes3 are affiliate links. That relationship does not change the editorial goal of publishing clear, buyer-first guidance and honest reasons to skip a product when appropriate.</p>
        </div>
      </article>
    </PublicShell>
  )
}
