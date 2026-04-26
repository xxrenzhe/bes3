import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { HardcoreEvidenceMatrix } from '@/components/site/HardcoreEvidenceMatrix'
import { StructuredData } from '@/components/site/StructuredData'
import { getMultiConstraintLandingPage, getScenarioLandingPage } from '@/lib/hardcore'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildCollectionPageSchema, buildFaqSchema } from '@/lib/structured-data'

function normalizeScenarioSlug(category: string, landing: string) {
  const prefix = `best-${category}-for-`
  return landing.startsWith(prefix) ? landing.slice('best-'.length) : ''
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ category: string; landing: string }>
}): Promise<Metadata> {
  const resolved = await params
  const routeSlug = normalizeScenarioSlug(resolved.category, resolved.landing)
  const page = routeSlug ? await getScenarioLandingPage(resolved.category, routeSlug) : null
  const multiPage = page ? null : await getMultiConstraintLandingPage(resolved.category, resolved.landing)
  if (!page) {
    if (multiPage) {
      const tagLabel = multiPage.tags.map((tag) => tag.name).join(' + ')
      return buildPageMetadata({
        title: `Reddit Consensus: Best ${multiPage.category.name} for ${tagLabel}`,
        description: `Bes3 cross-checks ${multiPage.category.name} against both ${tagLabel} using teardown evidence and price-value signals.`,
        path: `/${multiPage.category.slug}/${resolved.landing}`,
        locale: getRequestLocale(),
        keywords: [`best ${multiPage.category.name} for ${tagLabel}`, 'multi constraint product evidence', 'Reddit consensus']
      })
    }
    return buildPageMetadata({
      title: 'Scenario Researching',
      description: 'This Bes3 scenario page is not ready yet.',
      path: `/${resolved.category}/${resolved.landing}`,
      locale: getRequestLocale(),
      robots: { index: false, follow: true }
    })
  }

  return buildPageMetadata({
    title: `Reddit Consensus: Best ${page.category.name} for ${page.tag.name}`,
    description: `Bes3 analyzes creator teardown evidence to rank the best ${page.category.name} for ${page.tag.name}.`,
    path: `/${page.category.slug}/best-${page.category.slug}-for-${page.tag.slug}`,
    locale: getRequestLocale(),
    keywords: [`best ${page.category.name} for ${page.tag.name}`, `${page.tag.name} ${page.category.name}`, 'Reddit consensus']
  })
}

export default async function ScenarioLandingPage({
  params
}: {
  params: Promise<{ category: string; landing: string }>
}) {
  const resolved = await params
  const routeSlug = normalizeScenarioSlug(resolved.category, resolved.landing)
  const page = routeSlug ? await getScenarioLandingPage(resolved.category, routeSlug) : null
  const multiPage = page ? null : await getMultiConstraintLandingPage(resolved.category, resolved.landing)
  if (!page && !multiPage) notFound()
  const path = page
    ? `/${page.category.slug}/best-${page.category.slug}-for-${page.tag.slug}`
    : `/${multiPage!.category.slug}/${resolved.landing}`
  const title = page
    ? `Reddit Consensus: Best ${page.category.name} for ${page.tag.name}`
    : `Reddit Consensus: Best ${multiPage!.category.name} for ${multiPage!.tags.map((tag) => tag.name).join(' + ')}`
  const products = page ? page.products : multiPage!.products
  const faqEntries = [
    {
      question: page ? `Why does this page focus on ${page.tag.name}?` : 'Why combine these constraints?',
      answer: page
        ? `${page.tag.name} is treated as a canonical pain point. Products only deserve a ranking when the evidence pipeline finds real creator tests for that scenario.`
        : 'Multi-constraint pages only rank products when the same evidence graph can satisfy more than one real buying pain point.'
    },
    {
      question: 'Why can this page show researching instead of a winner?',
      answer: 'The v2 rule is no fabricated winners. A scenario page needs at least three products with useful evidence before it becomes a live recommendation matrix.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildCollectionPageSchema({
            path,
            title,
            description: `Scenario matrix for ${page ? page.category.name : multiPage!.category.name}.`,
            items: products.map((product) => ({
              name: product.name,
              path: `/products/${product.slug}`
            }))
          }),
          buildFaqSchema(path, faqEntries)
        ]}
      />
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Programmatic Scenario Page</p>
          <h1 className="mt-4 max-w-5xl font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-7xl">
            {title}.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            BLUF: Bes3 cross-checks YouTube teardown evidence against this pain point, then displays the matrix in raw HTML so humans and RAG crawlers can read it without hidden tabs.
          </p>
        </div>
      </section>
      <HardcoreEvidenceMatrix products={products} emptyTitle={`${title} is still below the evidence threshold.`} />
    </PublicShell>
  )
}
