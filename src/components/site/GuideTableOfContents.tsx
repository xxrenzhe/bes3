import Link from 'next/link'
import type { EditorialTocEntry } from '@/lib/editorial-html'

export function GuideTableOfContents({
  entries
}: {
  entries: EditorialTocEntry[]
}) {
  if (!entries.length) return null

  return (
    <div className="sticky top-24 rounded-[2rem] bg-white p-6 shadow-panel">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">On this page</p>
      <nav aria-label="Guide table of contents" className="mt-5 flex flex-col gap-2">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            href={`#${entry.id}`}
            className={`rounded-xl px-3 py-2 text-sm transition-colors hover:bg-emerald-50 hover:text-primary ${
              entry.level === 3 ? 'pl-6 text-muted-foreground' : 'font-semibold text-foreground'
            }`}
          >
            {entry.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
