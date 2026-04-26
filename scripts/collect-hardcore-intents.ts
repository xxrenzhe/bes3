import './load-env'
import { bootstrapApplication } from '@/lib/bootstrap'
import { HARDCORE_CATEGORIES } from '@/lib/hardcore-catalog'
import { promoteIntentSourceToPendingTag, recordTaxonomyIntentSource } from '@/lib/hardcore-ops'
import { slugify } from '@/lib/slug'

type IntentSource = 'amazon_autosuggest' | 'reddit'

interface CollectedIntent {
  categorySlug: string
  sourceType: IntentSource
  rawQuery: string
  searchVolume?: number | null
  competition?: string | null
}

function readFlag(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) || ''
}

function readNumberFlag(name: string, fallback: number) {
  const parsed = Number(readFlag(name))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean)))
}

async function fetchAmazonAutosuggest(categorySlug: string, seed: string, limit: number): Promise<CollectedIntent[]> {
  const prefixes = ['for ', 'best ', 'with ', 'under ', 'vs '].flatMap((modifier) => [`${seed} ${modifier}`, `${modifier}${seed} `])
  const suggestions: string[] = []

  for (const prefix of prefixes.slice(0, limit)) {
    const url = new URL('https://completion.amazon.com/api/2017/suggestions')
    url.searchParams.set('session-id', 'bes3-hardcore-intent')
    url.searchParams.set('request-id', `bes3-${Date.now()}`)
    url.searchParams.set('page-type', 'Gateway')
    url.searchParams.set('site-variant', 'desktop')
    url.searchParams.set('client-info', 'amazon-search-ui')
    url.searchParams.set('mid', 'ATVPDKIKX0DER')
    url.searchParams.set('alias', 'aps')
    url.searchParams.set('prefix', prefix)

    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0 Bes3IntentCollector/1.0'
      }
    })
    if (response.ok) {
      const payload = await response.json().catch(() => null)
      const items = Array.isArray(payload?.suggestions) ? payload.suggestions : []
      suggestions.push(...items.map((item: { value?: string }) => item.value || ''))
    }
    await sleep(300 + Math.round(Math.random() * 700))
  }

  return unique(suggestions).map((rawQuery) => ({
    categorySlug,
    sourceType: 'amazon_autosuggest',
    rawQuery
  }))
}

async function fetchRedditIntents(categorySlug: string, seed: string, limit: number): Promise<CollectedIntent[]> {
  const queries = [`"${seed}" "help me choose"`, `"${seed}" vs`, `"${seed}" review`]
  const titles: string[] = []

  for (const query of queries) {
    const url = new URL('https://www.reddit.com/search.json')
    url.searchParams.set('q', query)
    url.searchParams.set('sort', 'relevance')
    url.searchParams.set('limit', String(limit))

    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'Bes3IntentCollector/1.0 by bes3'
      }
    })
    if (response.ok) {
      const payload = await response.json().catch(() => null)
      const posts = Array.isArray(payload?.data?.children) ? payload.data.children : []
      titles.push(...posts.map((post: { data?: { title?: string } }) => post.data?.title || ''))
    }
    await sleep(800 + Math.round(Math.random() * 1200))
  }

  return unique(titles).map((rawQuery) => ({
    categorySlug,
    sourceType: 'reddit',
    rawQuery
  }))
}

async function persistIntent(intent: CollectedIntent, promote: boolean) {
  const result = await recordTaxonomyIntentSource(intent)
  if (promote) {
    await promoteIntentSourceToPendingTag({
      categorySlug: intent.categorySlug,
      rawQuery: intent.rawQuery,
      source: intent.sourceType,
      searchVolume: intent.searchVolume
    })
  }
  return result
}

async function main() {
  const categoryFilter = slugify(readFlag('category'))
  const source = (readFlag('source') || 'all') as IntentSource | 'all'
  const limit = readNumberFlag('limit', 10)
  const promote = hasFlag('promote-pending')
  const dryRun = hasFlag('dry-run')

  const categories = HARDCORE_CATEGORIES.filter((category) => !categoryFilter || category.slug === categoryFilter)
  if (!categories.length) {
    throw new Error(`No hardcore category matched ${categoryFilter}`)
  }

  await bootstrapApplication()
  const collected: CollectedIntent[] = []

  for (const category of categories) {
    for (const seed of category.redditSeeds.slice(0, 3)) {
      if (source === 'all' || source === 'amazon_autosuggest') {
        collected.push(...await fetchAmazonAutosuggest(category.slug, seed, limit))
      }
      if (source === 'all' || source === 'reddit') {
        collected.push(...await fetchRedditIntents(category.slug, seed, limit))
      }
    }
  }

  const deduped = Array.from(
    new Map(collected.map((intent) => [`${intent.categorySlug}:${intent.sourceType}:${slugify(intent.rawQuery)}`, intent])).values()
  )

  const results = dryRun ? [] : await Promise.all(deduped.map((intent) => persistIntent(intent, promote)))

  console.log(JSON.stringify({
    dryRun,
    source,
    categories: categories.map((category) => category.slug),
    collected: deduped.length,
    created: results.filter((result) => result.status === 'created').length,
    updated: results.filter((result) => result.status === 'updated').length,
    promotedToPending: promote,
    sample: deduped.slice(0, 20)
  }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
