import Link from 'next/link'

export interface SeoHubLink {
  href: string
  label: string
  note?: string
}

export function compactSeoHubLinks(links: Array<SeoHubLink | null>): SeoHubLink[] {
  return links.filter((link): link is SeoHubLink => Boolean(link))
}

export interface SeoHubSection {
  id: string
  eyebrow: string
  title: string
  description?: string
  links: SeoHubLink[]
}

export function SeoHubLinksPanel({
  title = 'More helpful pages',
  description = 'These links keep the most useful category, brand, product, and guide pages close by so you can keep moving without starting over.',
  sections
}: {
  title?: string
  description?: string
  sections: SeoHubSection[]
}) {
  const visibleSections = sections.filter((section) => section.links.length)
  if (!visibleSections.length) return null

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-panel sm:p-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Keep exploring</p>
      <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {visibleSections.map((section) => (
          <div key={section.id} className="rounded-[1.5rem] border border-border/60 bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{section.eyebrow}</p>
            <h3 className="mt-3 text-xl font-black tracking-tight text-foreground">{section.title}</h3>
            {section.description ? <p className="mt-2 text-sm leading-7 text-muted-foreground">{section.description}</p> : null}
            <div className="mt-4 space-y-3">
              {section.links.map((link) => (
                <Link
                  key={`${section.id}-${link.href}-${link.label}`}
                  href={link.href}
                  className="block rounded-[1rem] bg-white/90 px-4 py-4 transition-colors hover:bg-white"
                >
                  <p className="text-sm font-semibold text-foreground">{link.label}</p>
                  {link.note ? <p className="mt-1 text-xs leading-6 text-muted-foreground">{link.note}</p> : null}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
