import { LoginForm } from '@/components/admin/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#fff6e8_0%,#ecf8f2_52%,#f4efe4_100%)] px-4 py-16">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Bes3 Admin</p>
          <h1 className="font-[var(--font-display)] text-6xl font-semibold tracking-tight">Operate the full affiliate-to-SEO pipeline from one console.</h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">Import affiliate products, scrape detail pages, persist media, mine keywords, generate review and comparison articles, then update SEO metadata in one flow.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
