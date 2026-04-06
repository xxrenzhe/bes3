import Link from 'next/link'

export type RouteRecoveryLink = {
  href: string
  label: string
  note: string
}

export type RouteRecoverySection = {
  eyebrow: string
  title: string
  links: RouteRecoveryLink[]
}

export function RouteRecoveryPanel({
  kicker,
  title,
  description,
  queryLabel,
  searchHref,
  sections
}: {
  kicker: string
  title: string
  description: string
  queryLabel: string
  searchHref: string
  sections: RouteRecoverySection[]
}) {
  const visibleSections = sections.filter((section) => section.links.length)

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-14 sm:px-6 lg:px-8">
      <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
        <p className="editorial-kicker">{kicker}</p>
        <h1 className="mt-3 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-6xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">{description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-panel">
            Requested: {queryLabel}
          </span>
          <Link href={searchHref} className="rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-5 py-3 text-sm font-semibold text-primary-foreground">
            Search Bes3 for this intent
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {visibleSections.map((section) => (
          <div key={section.title} className="rounded-[2rem] bg-white p-7 shadow-panel">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">{section.eyebrow}</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{section.title}</h2>
            <div className="mt-5 space-y-3">
              {section.links.map((link) => (
                <Link key={link.href} href={link.href} className="block rounded-[1.25rem] bg-muted px-4 py-4 transition-colors hover:bg-emerald-50">
                  <p className="text-sm font-semibold text-foreground">{link.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{link.note}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
