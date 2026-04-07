import Link from 'next/link'

export type ShoppingStateRoute = {
  eyebrow: string
  title: string
  description: string
  bestIf: string
  notIf: string
  href: string
  label: string
}

export function ShoppingStateRouter({
  eyebrow,
  title,
  description,
  routes
}: {
  eyebrow: string
  title: string
  description: string
  routes: ShoppingStateRoute[]
}) {
  return (
    <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="editorial-kicker">{eyebrow}</p>
          <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">{title}</h2>
        </div>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
      </div>

      <div className={`mt-6 grid gap-4 ${routes.length >= 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
        {routes.map((route) => (
          <Link
            key={route.title}
            href={route.href}
            className="rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-1"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{route.eyebrow}</p>
            <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{route.title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{route.description}</p>
            <div className="mt-5 rounded-[1.25rem] bg-muted/70 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Best if</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{route.bestIf}</p>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Not if</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{route.notIf}</p>
            </div>
            <p className="mt-5 text-sm font-semibold text-primary">{route.label} →</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
