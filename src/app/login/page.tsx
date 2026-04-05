import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/components/admin/LoginForm'
import { DEFAULT_SITE_NAME, DEFAULT_SITE_TAGLINE } from '@/lib/constants'
import { buildPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Internal Login',
  description: 'Internal-only Bes3 CMS login for the team managing products, editorial pages, and operational settings.',
  path: '/login',
  robots: {
    index: false,
    follow: false
  }
})

export default function LoginPage() {
  const publicRoutes = [
    {
      eyebrow: 'Search',
      title: 'Return to the buyer guide',
      description: 'Use product search if you were trying to narrow a real purchase decision instead of entering the internal CMS.',
      href: '/search?scope=products',
      label: 'Open search'
    },
    {
      eyebrow: 'Trust',
      title: 'Read how Bes3 works',
      description: 'Use the public methodology page if you want to understand the buyer-first logic behind the site.',
      href: '/about',
      label: 'Open About'
    },
    {
      eyebrow: 'Support',
      title: 'Contact the team',
      description: 'Use contact if you need help with a public page, correction, or partnership request instead of admin access.',
      href: '/contact',
      label: 'Open Contact'
    }
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#020617_0%,#0f172a_36%,#eff4ff_36%,#f8fbff_100%)] px-4 py-10 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/80 shadow-[0_40px_100px_-60px_rgba(15,23,42,0.7)] backdrop-blur-xl lg:grid-cols-[1.05fr_420px]">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.24),transparent_24%),linear-gradient(180deg,#0f172a_0%,#111827_100%)] px-8 py-10 text-white lg:px-12 lg:py-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-emerald-200/80">Public Site</p>
              <h2 className="font-[var(--font-display)] text-2xl font-black tracking-tight text-white">{DEFAULT_SITE_NAME}</h2>
              <p className="text-sm text-slate-300">{DEFAULT_SITE_TAGLINE}</p>
            </Link>
            <Link href="/" className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              Back to buyer site
            </Link>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-200/80">Bes3 Internal Console</p>
          <h1 className="mt-6 max-w-3xl font-[var(--font-display)] text-5xl font-black tracking-tight text-white sm:text-6xl">
            Run the buying-guide operation behind the public site.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Internal staff use this workspace to ingest products, generate buyer-facing pages, and control runtime systems. None of this messaging appears on the consumer site.
          </p>
          <div className="mt-8 rounded-[1.75rem] border border-emerald-200/15 bg-white/5 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Boundary note</p>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              If you are a shopper, this is the wrong page. The public Bes3 experience lives in search, shortlist, reviews, comparisons, and alerts. This login is only for the team running the CMS.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Inventory</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">Affiliate imports and manual product entries land here first.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Editorial</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">Reviews, comparisons, and guides stay aligned with the Bes3 design system.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Runtime</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">AI, proxy, media, and SEO settings remain auditable and centralized.</p>
            </div>
          </div>

          <div className="mt-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Not looking for admin?</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {publicRoutes.map((route) => (
                <Link
                  key={route.title}
                  href={route.href}
                  className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/10"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">{route.eyebrow}</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-white">{route.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-200">{route.description}</p>
                  <p className="mt-4 text-sm font-semibold text-emerald-200">{route.label} →</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-6 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(239,244,255,0.94))] p-6 lg:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-white/80 px-4 py-3 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.35)]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Internal Only</p>
              <p className="mt-1 text-sm text-slate-600">Use Bes3 team credentials to enter the CMS.</p>
            </div>
            <Link href="/" className="text-sm font-semibold text-primary transition-colors hover:text-emerald-700">
              Return to public site →
            </Link>
          </div>
          <LoginForm />
          <div className="rounded-[1.5rem] bg-white/85 p-5 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.35)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Quick exits</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/search?scope=products" className="rounded-full border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                Search
              </Link>
              <Link href="/about" className="rounded-full border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                How We Test
              </Link>
              <Link href="/contact" className="rounded-full border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
