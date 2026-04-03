import { PublicShell } from '@/components/layout/PublicShell'

export default function PrivacyPage() {
  return (
    <PublicShell>
      <article className="prose prose-slate mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <p>Last Updated: 2026-04-03</p>
        <h1>Privacy Policy</h1>
        <p>Bes3 stores basic admin authentication, operational settings, product data, and newsletter opt-ins required to operate the platform.</p>
        <h2>Data we store</h2>
        <ul>
          <li>Administrator account and session data.</li>
          <li>Affiliate product records and published article metadata.</li>
          <li>Newsletter signups submitted through the site.</li>
        </ul>
      </article>
    </PublicShell>
  )
}
