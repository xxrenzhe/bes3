import { PublicShell } from '@/components/layout/PublicShell'

export default function PrivacyPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-fit rounded-full bg-white/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary shadow-panel">
          Legal Framework
        </div>
        <div className="mt-8 editorial-prose">
          <p>Last Updated: April 3, 2026</p>
          <h1>Privacy Policy</h1>
          <p>Bes3 stores only the operational and subscriber information required to run the site, deliver newsletter updates, and maintain platform security.</p>
          <h2>Data we store</h2>
          <ul>
            <li>Administrator accounts and session records used to secure the internal CMS.</li>
            <li>Affiliate product records, article metadata, and operational settings required to publish Bes3 pages.</li>
            <li>Newsletter signups submitted through the site.</li>
          </ul>
          <h2>How we use it</h2>
          <p>We use the information above to operate Bes3, maintain publishing workflows, and deliver the buyer-facing content and email updates you requested.</p>
        </div>
      </article>
    </PublicShell>
  )
}
