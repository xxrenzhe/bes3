import { load } from 'cheerio'
import { slugify } from '@/lib/slug'

export type EditorialTocEntry = {
  id: string
  label: string
  level: 2 | 3
}

export function normalizeEditorialHtml(contentHtml: string) {
  return contentHtml.replace(/<h1(\s|>)/gi, '<h2$1').replace(/<\/h1>/gi, '</h2>')
}

export function prepareEditorialHtmlWithToc(contentHtml: string): {
  html: string
  toc: EditorialTocEntry[]
} {
  const normalizedHtml = normalizeEditorialHtml(contentHtml)
  const $ = load(normalizedHtml)
  const toc: EditorialTocEntry[] = []
  const seenIds = new Set<string>()

  $('h2, h3').each((_, element) => {
    const heading = $(element)
    const level = element.tagName === 'h3' ? 3 : 2
    const label = heading.text().replace(/\s+/g, ' ').trim()
    if (!label) return

    const baseId = slugify(label) || `section-${toc.length + 1}`
    let nextId = baseId
    let counter = 2

    while (seenIds.has(nextId)) {
      nextId = `${baseId}-${counter}`
      counter += 1
    }

    seenIds.add(nextId)
    heading.attr('id', nextId)
    toc.push({
      id: nextId,
      label,
      level
    })
  })

  return {
    html: $('body').html() || $.root().html() || normalizedHtml,
    toc
  }
}
