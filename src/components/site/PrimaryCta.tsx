import Link from 'next/link'

export function PrimaryCta({
  href,
  label = 'Check Current Price',
  note
}: {
  href: string
  label?: string
  note?: string
}) {
  return (
    <div className="space-y-2">
      <Link
        href={href}
        target="_blank"
        className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),#00855d)] px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-emerald-950/10 transition-transform hover:-translate-y-0.5"
      >
        {label}
        <span aria-hidden="true">↗</span>
      </Link>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      <p className="text-xs text-muted-foreground">Affiliate disclosure: Bes3 may earn from qualifying purchases at no extra cost to you.</p>
    </div>
  )
}
