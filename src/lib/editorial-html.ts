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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInlineMarkdown(value: string) {
  let rendered = escapeHtml(value)
  rendered = rendered.replace(/\*\*\[([^\]]+)]\((https?:\/\/[^)\s]+)\)\*\*/g, '<a href="$2" rel="nofollow noopener" target="_blank"><strong>$1</strong></a>')
  rendered = rendered.replace(/\[([^\]]+)]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="nofollow noopener" target="_blank">$1</a>')
  rendered = rendered.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  return rendered
}

function renderMarkdownParagraphBlock(value: string) {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const html: string[] = []
  let paragraphLines: string[] = []
  let listItems: string[] = []

  const flushParagraph = () => {
    if (!paragraphLines.length) return
    html.push(`<p>${renderInlineMarkdown(paragraphLines.join(' '))}</p>`)
    paragraphLines = []
  }

  const flushList = () => {
    if (!listItems.length) return
    html.push(`<ul>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ul>`)
    listItems = []
  }

  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    const listItem = line.match(/^(?:[-*])\s+(.+)$/)

    if (heading) {
      flushParagraph()
      flushList()
      const level = heading[1].length <= 1 ? 2 : heading[1].length
      html.push(`<h${level}>${renderInlineMarkdown(heading[2].trim())}</h${level}>`)
      continue
    }

    if (/^-{3,}$/.test(line)) {
      flushParagraph()
      flushList()
      html.push('<hr />')
      continue
    }

    if (listItem) {
      flushParagraph()
      listItems.push(listItem[1].trim())
      continue
    }

    flushList()
    paragraphLines.push(line)
  }

  flushParagraph()
  flushList()
  return html.join('')
}

function repairMarkdownParagraphs(contentHtml: string) {
  const $ = load(contentHtml)

  $('p').each((_, element) => {
    const paragraph = $(element)
    const text = paragraph.text().replace(/\u00a0/g, ' ').trim()
    if (!/^(#{1,3}\s+|---$|(?:[-*])\s+)|\n\s*(?:#{1,3}\s+|[-*]\s+)|\*\*[^*]+\*\*/m.test(text)) return

    const rendered = renderMarkdownParagraphBlock(text)
    if (rendered) paragraph.replaceWith(rendered)
  })

  return $('body').html() || $.root().html() || contentHtml
}

export function prepareEditorialHtmlWithToc(contentHtml: string): {
  html: string
  toc: EditorialTocEntry[]
} {
  const normalizedHtml = normalizeEditorialHtml(repairMarkdownParagraphs(contentHtml))
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
