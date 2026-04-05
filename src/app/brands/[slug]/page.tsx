import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { ProductSpotlightCard } from '@/components/site/ProductSpotlightCard'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { formatEditorialDate, getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata, pickMetadataDescription } from '@/lib/metadata'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildHowToSchema } from '@/lib/structured-data'
import { getBrandSlug, listBrands, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const slug = (await params).slug
  const brand = (await listBrands()).find((entry) => entry.slug === slug) || null

  if (!brand) {
    return buildPageMetadata({
      title: 'Brand Not Found',
      description: 'This Bes3 brand page is unavailable.',
      path: `/brands/${slug}`,
      robots: {
        index: false,
        follow: false
      }
    })
  }

  return buildPageMetadata({
    title: `${brand.name} Buying Guide`,
    description:
      pickMetadataDescription(brand.description) ||
      `Browse ${brand.name} products, reviews, comparisons, and active categories on Bes3 without reopening broad search.`,
    path: `/brands/${brand.slug}`,
    image: brand.heroImageUrl,
    category: brand.categories[0] ? getCategoryLabel(brand.categories[0]) : undefined,
    freshnessDate: brand.latestUpdate,
    freshnessInTitle: true,
    keywords: [brand.name, `${brand.name} reviews`, `${brand.name} products`, 'brand buying guide']
  })
}

export default async function BrandPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const slug = (await params).slug
  const [brands, allArticles, allProducts] = await Promise.all([
    listBrands(),
    listPublishedArticles(),
    listPublishedProducts()
  ])
  const brand = brands.find((entry) => entry.slug === slug) || null

  if (!brand) notFound()

  const brandProducts = allProducts.filter((product) => getBrandSlug(product.brand) === slug)
  const brandArticles = allArticles.filter((article) => getBrandSlug(article.product?.brand) === slug)
  const leadReview = brandArticles.find((article) => article.type === 'review') || brandArticles[0] || null
  const leadComparison = brandArticles.find((article) => article.type === 'comparison') || null
  const leadCategory = brand.categories[0] || ''
  const faqEntries = [
    {
      question: `What does the ${brand.name} page include?`,
      answer: `It groups the live ${brand.name} product pages, reviews, comparisons, and category links that Bes3 has already published, so shoppers can stay focused on one brand.`
    },
    {
      question: `When should I leave the ${brand.name} page and return to a category page?`,
      answer: `Leave the brand page when the manufacturer no longer feels like the right constraint. Category pages are better once you need honest cross-brand tradeoffs.`
    },
    {
      question: `What is the best next move after this brand page?`,
      answer: leadComparison
        ? 'Use the live comparison if the shortlist is already tight. Otherwise start with the strongest product or review, then come back to the category page only if you need wider context.'
        : 'Start with the strongest product or review on this page. If coverage is still thin, return to the category page to keep the shortlist broader.'
    }
  ]
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Brands', path: '/brands' },
    { name: brand.name, path: `/brands/${brand.slug}` }
  ]
  const structuredData = [
    buildBreadcrumbSchema(`/brands/${brand.slug}`, breadcrumbItems),
    buildCollectionPageSchema({
      path: `/brands/${brand.slug}`,
      title: `${brand.name} Buying Guide`,
      description:
        pickMetadataDescription(brand.description) ||
        `Browse ${brand.name} products, reviews, comparisons, and active categories on Bes3 without reopening broad search.`,
      image: brand.heroImageUrl,
      breadcrumbItems,
      dateModified: brand.latestUpdate,
      about: {
        '@type': 'Brand',
        name: brand.name
      },
      items: [
        ...brandProducts.slice(0, 6).map((product) => ({
          name: product.productName,
          path: product.slug ? `/products/${product.slug}` : `/brands/${brand.slug}`
        })),
        ...brandArticles.slice(0, 6).map((article) => ({
          name: article.title,
          path: getArticlePath(article.type, article.slug)
        }))
      ]
    }),
    buildHowToSchema(
      `/brands/${brand.slug}`,
      `How to use the ${brand.name} brand page`,
      'Use the brand page to start with the strongest product, validate the brand with a review, and go back to category comparisons only if your search broadens.',
      [
        {
          name: 'Start with the strongest product',
          text: 'Open the most credible product page when you already trust the brand and want the shortest path into specs, price context, and shortlist actions.'
        },
        {
          name: 'Validate with brand coverage',
          text: 'Use the review or comparison pages tied to this brand once you need a clearer fit check or a head-to-head comparison.'
        },
        {
          name: 'Return to categories when needed',
          text: 'If the brand no longer feels like the right constraint, reopen the related category pages so you can compare across manufacturers without losing your place.'
        }
      ]
    ),
    buildFaqSchema(`/brands/${brand.slug}`, faqEntries)
  ]
  const brandRoutes = [
    brandProducts[0]
      ? {
          eyebrow: 'Start',
          title: `Open the lead ${brand.name} product`,
          description: 'Begin with the strongest current product page if you already trust the brand and want the cleanest next step into specs, pricing, and shortlist actions.',
          href: brandProducts[0].slug ? `/products/${brandProducts[0].slug}` : `/brands/${brand.slug}`,
          label: 'Open product details'
        }
      : null,
    leadReview
      ? {
          eyebrow: 'Validate',
          title: 'Read the clearest brand review',
          description: 'Use the lead review once one product already looks promising and you want one more fit check before comparing or clicking out.',
          href: getArticlePath(leadReview.type, leadReview.slug),
          label: 'Open review'
        }
      : null,
    leadComparison
      ? {
          eyebrow: 'Compare',
          title: 'Pressure-test the best options',
          description: 'The comparison page is best when this brand already has multiple credible finalists and you want the tradeoffs condensed into one answer.',
          href: getArticlePath(leadComparison.type, leadComparison.slug),
          label: 'Open comparison'
        }
      : leadCategory
        ? {
            eyebrow: 'Explore',
            title: `Open ${brand.name} in ${getCategoryLabel(leadCategory)}`,
            description: 'Use the brand-and-category view when both filters already matter and you want the shortest path into exact-match products and next steps.',
            href: `/brands/${brand.slug}/categories/${leadCategory}`,
            label: 'Open this view'
          }
        : null,
    leadCategory
      ? {
          eyebrow: 'Watch',
          title: `Track ${getCategoryLabel(leadCategory)}`,
          description: 'If timing is the blocker, keep the surrounding category active instead of forcing a brand choice today.',
          href: `/newsletter?intent=price-alert&category=${encodeURIComponent(leadCategory)}&cadence=priority`,
          label: 'Start price alert'
        }
      : null
  ].filter(Boolean) as Array<{
    eyebrow: string
    title: string
    description: string
    href: string
    label: string
  }>

  return (
    <PublicShell>
      <StructuredData data={structuredData} />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <Link href="/brands" className="inline-flex text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                Brands / {brand.name}
              </Link>
              <p className="editorial-kicker mt-4">Brand Page</p>
              <h1 className="mt-3 font-[var(--font-display)] text-5xl font-black tracking-tight text-foreground sm:text-6xl">
                {brand.name} on Bes3
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
                {brand.description || `This page collects the current ${brand.name} product coverage, reviews, and category links currently available on Bes3.`}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Products</p>
                  <p className="mt-2 text-2xl font-black text-foreground">{brand.productCount}</p>
                </div>
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Editorial pages</p>
                  <p className="mt-2 text-2xl font-black text-foreground">{brand.articleCount}</p>
                </div>
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Latest refresh</p>
                  <p className="mt-2 text-lg font-black text-foreground">{formatEditorialDate(brand.latestUpdate, 'Building coverage')}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {brandRoutes.map((route) => (
                <Link
                  key={route.title}
                  href={route.href}
                  className="rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-1"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{route.eyebrow}</p>
                  <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{route.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{route.description}</p>
                  <p className="mt-5 text-sm font-semibold text-primary">{route.label} →</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {brandProducts.length ? (
          <section className="space-y-6">
            <div>
              <p className="editorial-kicker">Top Products</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Start with the strongest {brand.name} picks.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                These are the cleanest current entry points into {brand.name}: published products that already carry price context, specs, and a way forward into shortlist or store actions.
              </p>
            </div>
            <div className="grid gap-6 xl:grid-cols-3">
              {brandProducts.slice(0, 3).map((product) => (
                <ProductSpotlightCard key={product.id} product={product} source="brand-hub-shortlist" />
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] bg-white p-8 shadow-panel">
            <p className="editorial-kicker">Category Spread</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">See where {brand.name} is already active.</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {brand.categories.map((category) => (
                <Link
                  key={category}
                  href={`/brands/${brand.slug}/categories/${category}`}
                  className="rounded-[1.5rem] bg-muted p-5 transition-colors hover:bg-emerald-50"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Brand + Category</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">
                    {brand.name} {getCategoryLabel(category)}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Open the exact {brand.name} + {getCategoryLabel(category)} view before reopening the broader category page for cross-brand comparisons.
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-8 shadow-panel">
            <p className="editorial-kicker">Live Coverage</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Brand-related editorial already published.</h2>
            <div className="mt-6 space-y-3">
              {brandArticles.slice(0, 5).map((article) => (
                <Link
                  key={article.id}
                  href={getArticlePath(article.type, article.slug)}
                  className="block rounded-[1.5rem] bg-muted px-5 py-4 transition-colors hover:bg-emerald-50"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{article.type}</p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">{article.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{article.summary}</p>
                </Link>
              ))}
              {!brandArticles.length ? (
                <p className="text-sm leading-7 text-muted-foreground">
                  Editorial coverage for {brand.name} is still building. Use the product pages above or return to category pages for broader coverage.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <SeoFaqSection
          title={`${brand.name} buyer questions, answered fast.`}
          entries={faqEntries}
          description="This FAQ mirrors the brand-first questions real buyers ask and makes the next step easier to choose."
        />
      </div>
    </PublicShell>
  )
}
