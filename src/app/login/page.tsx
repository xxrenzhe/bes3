import { LoginForm } from '@/components/admin/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#020617_0%,#0f172a_36%,#eff4ff_36%,#f8fbff_100%)] px-4 py-10 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/80 shadow-[0_40px_100px_-60px_rgba(15,23,42,0.7)] backdrop-blur-xl lg:grid-cols-[1.05fr_420px]">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.24),transparent_24%),linear-gradient(180deg,#0f172a_0%,#111827_100%)] px-8 py-10 text-white lg:px-12 lg:py-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-200/80">Bes3 Internal Console</p>
          <h1 className="mt-6 max-w-3xl font-[var(--font-display)] text-5xl font-black tracking-tight text-white sm:text-6xl">
            Run the buying-guide operation behind the public site.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Internal staff use this workspace to ingest products, generate buyer-facing pages, and control runtime systems. None of this messaging appears on the consumer site.
          </p>
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
        </div>

        <div className="flex items-center bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(239,244,255,0.94))] p-6 lg:p-10">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
