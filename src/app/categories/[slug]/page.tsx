import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { ProductSpotlightCard } from '@/components/site/ProductSpotlightCard'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { formatEditorialDate, getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata, pickMetadataDescription, toTitleCaseWords } from '@/lib/metadata'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildHowToSchema } from '@/lib/structured-data'
import { getBrandSlug, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const slug = (await params).slug
  const [allArticles, allProducts] = await Promise.all([listPublishedArticles(), listPublishedProducts()])
  const articles = allArticles.filter((article) => article.product?.category === slug)
  const products = allProducts.filter((product) => product.category === slug)
  const leadArticle = articles.find((article) => article.type === 'review') || articles[0] || null
  const leadProduct = products[0] || null
  const categoryLabel = getCategoryLabel(slug)
  const freshnessDate =
    leadArticle?.updatedAt ||
    leadArticle?.publishedAt ||
    leadArticle?.createdAt ||
    leadProduct?.updatedAt ||
    leadProduct?.publishedAt ||
    null

  return buildPageMetadata({
    title: `${toTitleCaseWords(categoryLabel)} Buying Guide`,
    description:
      pickMetadataDescription(leadArticle?.seoDescription, leadArticle?.summary, leadProduct?.description) ||
      `Browse ${categoryLabel} on Bes3 to shortlist products, read verdicts, compare finalists, and start alerts without losing the buying lane.`,
    path: `/categories/${slug}`,
    image: leadArticle?.heroImageUrl || leadProduct?.heroImageUrl,
    category: categoryLabel,
    freshnessDate,
    freshnessInTitle: true,
    keywords: [categoryLabel, 'buying guide', 'product reviews', 'comparisons'].filter(Boolean)
  })
}

export default async function CategoryPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const slug = (await params).slug
  const [allArticles, allProducts] = await Promise.all([listPublishedArticles(), listPublishedProducts()])
  const articles = allArticles.filter((article) => article.product?.category === slug)
  const products = allProducts.filter((product) => product.category === slug)
  const [featured, ...rest] = articles
  const featuredReview = articles.find((article) => article.type === 'review') || featured || null
  const featuredComparison = articles.find((article) => article.type === 'comparison') || null
  const featuredGuide = articles.find((article) => article.type === 'guide') || null
  const latestRefresh = [
    ...articles.map((article) => article.updatedAt || article.publishedAt || article.createdAt),
    ...products.map((product) => product.updatedAt || product.publishedAt)
  ].find(Boolean)
  const reviewCount = articles.filter((article) => article.type === 'review').length
  const comparisonCount = articles.filter((article) => article.type === 'comparison').length
  const categoryLabel = getCategoryLabel(slug)
  const secondaryArticles = rest.filter((article) => article.id !== featuredGuide?.id)
  const topBrands = Array.from(
    products.reduce((brands, product) => {
      const brandName = product.brand?.trim()
      const brandSlug = getBrandSlug(product.brand)

      if (!brandName || !brandSlug) return brands

      const existing = brands.get(brandSlug)
      if (existing) {
        existing.count += 1
        return brands
      }

      brands.set(brandSlug, {
        name: brandName,
        slug: brandSlug,
        count: 1
      })

      return brands
    }, new Map<string, { name: string; slug: string; count: number }>())
      .values()
  )
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, 4)
  const path = `/categories/${slug}`
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Directory', path: '/directory' },
    { name: toTitleCaseWords(categoryLabel), path }
  ]
  const howToSteps = [
    {
      name: 'Shortlist the credible products',
      text: 'Start with the strongest product cards when you still need the category narrowed into a few options worth saving.'
    },
    {
      name: 'Validate with a live verdict',
      text: featuredReview
        ? 'Open the lead review once one candidate already looks plausible and you want product-fit context before comparing.'
        : 'Use the strongest available page in the category to validate whether the lane is mature enough to act on.'
    },
    {
      name: 'Compare or track the lane',
      text: 'Move into comparisons when the shortlist is tight. If timing is the blocker, switch to category alerts without losing the same buying context.'
    }
  ]
  const structuredData = [
    buildBreadcrumbSchema(path, breadcrumbItems),
    buildCollectionPageSchema({
      path,
      title: `${toTitleCaseWords(categoryLabel)} Buying Guide`,
      description:
        pickMetadataDescription(featuredReview?.seoDescription, featuredReview?.summary, featured?.summary) ||
        `Browse ${categoryLabel} on Bes3 to shortlist products, read verdicts, compare finalists, and start alerts without losing the buying lane.`,
      image: featured?.heroImageUrl || products[0]?.heroImageUrl,
      breadcrumbItems,
      about: {
        '@type': 'Thing',
        name: categoryLabel
      },
      dateModified: latestRefresh,
      items: [
        ...products.slice(0, 6).map((product) => ({
          name: product.productName,
          path: product.slug ? `/products/${product.slug}` : path
        })),
        ...articles.slice(0, 6).map((article) => ({
          name: article.title,
          path: getArticlePath(article.type, article.slug)
        }))
      ]
    }),
    buildHowToSchema(path, `How to use the ${categoryLabel} category hub`, 'Use the category hub to shortlist credible products, validate the lead verdict, and compare or track the lane.', howToSteps)
  ]
  const faqEntries = [
    {
      question: `What should this ${categoryLabel} page help me do?`,
      answer: `It should help you stay inside one ${categoryLabel} buying lane: shortlist credible products, open the lead verdict, compare finalists, and switch to alerts if timing is the blocker.`
    },
    {
      question: 'When should I use a brand hub from here?',
      answer: 'Open a brand hub when one manufacturer is already plausible and you want every related product and editorial page in one place. Stay here when cross-brand comparison still matters.'
    },
    {
      question: 'Why does this page push next moves instead of dumping every result?',
      answer: 'Because category hubs work best as routing layers. They should reduce the decision tree, not recreate a noisy archive that forces you to reopen broad research.'
    }
  ]
  const buyerRoutes = [
    {
      eyebrow: 'Start',
      title: 'Find serious candidates',
      description: 'Open the shortlist cards first when you still need Bes3 to narrow this category into products worth saving.',
      href: '#category-shortlist',
      label: 'Jump to category shortlist'
    },
    {
      eyebrow: 'Validate',
      title: 'Read the lead verdict',
      description: 'Use the strongest review when one product is already catching your eye and you want buyer fit before comparing.',
      href: featuredReview ? getArticlePath(featuredReview.type, featuredReview.slug) : '/search',
      label: featuredReview ? 'Open lead review' : 'Search review archive'
    },
    {
      eyebrow: 'Decide',
      title: 'Compare finalists',
      description: 'Keep compare inside one category lane so tradeoffs stay honest, especially once you already have two credible options.',
      href: featuredComparison ? getArticlePath(featuredComparison.type, featuredComparison.slug) : '/shortlist',
      label: featuredComparison ? 'Open category comparison' : 'Use shortlist compare'
    },
    {
      eyebrow: 'Watch',
      title: 'Track this category',
      description: 'If the purchase is not happening today, turn this category into a price watch or briefing flow instead of losing the decision context.',
      href: `/newsletter?intent=category-brief&category=${encodeURIComponent(slug)}&cadence=weekly`,
      label: 'Start category alerts'
    }
  ]

  return (
    <PublicShell>
      <StructuredData data={[...structuredData, buildFaqSchema(path, faqEntries)]} />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] p-8 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.8)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <Link href="/directory" className="inline-flex text-sm font-medium text-white/70 transition-colors hover:text-white">
                Directory / {categoryLabel}
              </Link>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Category Hub</p>
              <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-6xl">{categoryLabel}</h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-200">
                Bes3 uses this hub to narrow the category into real product options, current editorial verdicts, and the shortest path from research mode to an informed click.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Product deep-dives</p>
                <p className="mt-3 text-3xl font-black">{products.length}</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Reviews + comparisons</p>
                <p className="mt-3 text-3xl font-black">{reviewCount + comparisonCount}</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Latest refresh</p>
                <p className="mt-3 text-lg font-black">{formatEditorialDate(latestRefresh, 'Building coverage')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">How To Use This Category</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Move from browsing to a real buying lane.</h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
                {categoryLabel} works best when you treat it as one clean decision lane: shortlist credible candidates, validate one product with a verdict page, compare only real finalists, and switch to alerts if the purchase is still waiting.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best current route</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {products.length >= 2
                    ? 'This category already has enough product coverage to shortlist and compare inside one lane. Start with the top candidates below, then use a review or comparison page once the field is smaller.'
                    : 'Coverage here is still early. Start with the strongest available product or verdict, then use alerts to wait for deeper category coverage if needed.'}
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {buyerRoutes.map((route) => (
                <Link
                  key={route.title}
                  href={route.href}
                  className="rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-1"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{route.eyebrow}</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{route.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{route.description}</p>
                  <p className="mt-5 text-sm font-semibold text-primary">{route.label} →</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {products.length ? (
          <section id="category-shortlist" className="space-y-6">
            <div>
              <p className="editorial-kicker">Shortlist</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Start with the strongest buying options.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                These product pages give buyers the fastest path into price context, specs, and merchant-ready decisions without losing the category view.
              </p>
            </div>
            <div className="grid gap-6 xl:grid-cols-3">
              {products.slice(0, 3).map((product) => (
                <ProductSpotlightCard key={product.id} product={product} source="category-hub-shortlist" />
              ))}
            </div>
          </section>
        ) : null}

        {topBrands.length ? (
          <section className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
            <div className="flex flex-col gap-3 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="editorial-kicker">Top Brands</p>
                <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Open the brand hubs already active in this lane.</h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                These brand pages capture manufacturer-first search intent without breaking the current {categoryLabel} decision path.
              </p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {topBrands.map((brand) => (
                <Link
                  key={brand.slug}
                  href={`/brands/${brand.slug}`}
                  className="rounded-[1.75rem] bg-muted p-6 transition-colors hover:bg-emerald-50"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Brand Hub</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{brand.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {brand.count} live product {brand.count === 1 ? 'page' : 'pages'} already connect this brand back into the {categoryLabel} lane.
                  </p>
                  <p className="mt-5 text-sm font-semibold text-primary">Open {brand.name} →</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {featured ? (
          <div className="grid gap-8 lg:grid-cols-12">
            <Link href={getArticlePath(featured.type, featured.slug)} className="group overflow-hidden rounded-[2.5rem] bg-white shadow-panel lg:col-span-8">
              <div className="relative aspect-[16/9] overflow-hidden bg-[linear-gradient(135deg,#e5eeff,#dfe9fa)]">
                {featured.heroImageUrl ? (
                  <Image
                    src={featured.heroImageUrl}
                    alt={featured.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="bg-grid absolute inset-0" />
                )}
              </div>
              <div className="space-y-5 p-10">
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  <span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">{featured.type}</span>
                  <span>Featured verdict</span>
                </div>
                <h2 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">{featured.title}</h2>
                <p className="max-w-3xl text-base leading-8 text-muted-foreground">{featured.summary}</p>
              </div>
            </Link>
            <div className="space-y-6 lg:col-span-4">
              {featuredGuide ? (
                <Link href={getArticlePath(featuredGuide.type, featuredGuide.slug)} className="block rounded-[2rem] border border-emerald-200 bg-emerald-50/80 p-7 shadow-panel transition-transform hover:-translate-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Guide</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{featuredGuide.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{featuredGuide.summary}</p>
                </Link>
              ) : null}
              {secondaryArticles.slice(0, 2).map((article) => (
                <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="block rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">{article.type}</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{article.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{article.summary}</p>
                </Link>
              ))}
            </div>
            {secondaryArticles.slice(2).map((article) => (
              <Link key={article.id} href={getArticlePath(article.type, article.slug)} className="block rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1 lg:col-span-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">{article.type}</p>
                <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{article.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{article.summary}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] bg-white p-10 text-center shadow-panel">
            <h2 className="font-[var(--font-display)] text-3xl font-black tracking-tight">Editorial coverage is still being built.</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Bes3 already recognizes this category, but the supporting review and comparison archive is still being expanded.
            </p>
          </div>
        )}

        <SeoFaqSection
          title={`${categoryLabel} hub questions, answered clearly.`}
          entries={faqEntries}
          description="This FAQ now makes the category-page routing logic explicit for both buyers and search engines, rather than leaving it implied by the visual layout."
        />
      </div>
    </PublicShell>
  )
}
