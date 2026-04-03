import Link from 'next/link'

export function PrimaryCta({
  href,
  label = 'Check Current Price'
}: {
  href: string
  label?: string
}) {
  return (
    <div className="space-y-2">
      <Link
        href={href}
        target="_blank"
        className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-panel transition-transform hover:-translate-y-0.5"
      >
        {label}
      </Link>
      <p className="text-xs text-muted-foreground">Hand-tested by Alex | Ad-free independent review</p>
    </div>
  )
}
