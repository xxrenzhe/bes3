import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { DecisionSummaryPanel } from '@/components/site/DecisionSummaryPanel'
import { ProductFinalistsSection } from '@/components/site/ProductFinalistsSection'
import { RouteRecoveryPanel } from '@/components/site/RouteRecoveryPanel'
import { SeoHubLinksPanel } from '@/components/site/SeoHubLinksPanel'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { buildBrandCategoryPath, buildCategoryPath, categoryMatches } from '@/lib/category'
import { formatEditorialDate, getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata, pickMetadataDescription, toTitleCaseWords } from '@/lib/metadata'
import { buildNewsletterPath } from '@/lib/newsletter-path'
import { deslugify, findSuggestedArticles, findSuggestedCategories, findSuggestedProducts } from '@/lib/route-recovery'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildHowToSchema } from '@/lib/structured-data'
import { getBrandSlug, listOpenCommerceProducts, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const slug = (await params).slug
  const [allArticles, allProducts, allCommerceProducts] = await Promise.all([listPublishedArticles(), listPublishedProducts(), listOpenCommerceProducts()])
  const articles = allArticles.filter((article) => categoryMatches(article.product?.category, slug))
  const products = allProducts.filter((product) => categoryMatches(product.category, slug))
  const resolvedCategory = products[0]?.category || articles[0]?.product?.category || slug
  const leadArticle = articles.find((article) => article.type === 'review') || articles[0] || null
  const leadProduct = allCommerceProducts.find((product) => categoryMatches(product.category, slug)) || products[0] || null
  const categoryLabel = getCategoryLabel(resolvedCategory)
  const freshnessDate =
    leadArticle?.updatedAt ||
    leadArticle?.publishedAt ||
    leadArticle?.createdAt ||
    leadProduct?.updatedAt ||
    leadProduct?.publishedAt ||
    null

  if (!articles.length && !products.length) {
    return buildPageMetadata({
      title: `${toTitleCaseWords(deslugify(slug) || 'Category')} Recovery`,
      description: 'The exact Bes3 category page is not ready yet. Use nearby category, product, and review pages instead of hitting a dead end.',
      path: `/categories/${slug}`,
      locale: getRequestLocale(),
      robots: {
        index: false,
        follow: true
      }
    })
  }

  return buildPageMetadata({
    title: `${toTitleCaseWords(categoryLabel)} Buying Guide`,
    description:
      pickMetadataDescription(leadArticle?.seoDescription, leadArticle?.summary, leadProduct?.description) ||
      `Browse ${categoryLabel} on Bes3 to find good products, read reviews, compare top picks, and start category updates without starting over.`,
    path: buildCategoryPath(resolvedCategory),
    locale: getRequestLocale(),
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
  const [allArticles, allProducts, allCommerceProducts] = await Promise.all([
    listPublishedArticles(),
    listPublishedProducts(),
    listOpenCommerceProducts()
  ])
  const articles = allArticles.filter((article) => categoryMatches(article.product?.category, slug))
  const products = allProducts.filter((product) => categoryMatches(product.category, slug))
  const commerceProducts = allCommerceProducts.filter((product) => categoryMatches(product.category, slug))
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
  const resolvedCategory = products[0]?.category || articles[0]?.product?.category || slug
  const categoryLabel = getCategoryLabel(resolvedCategory)
  const hasCoverage = Boolean(products.length || articles.length)

  if (!hasCoverage) {
    const categories = Array.from(
      new Set([
        ...allProducts.map((product) => product.category).filter(Boolean),
        ...allArticles.map((article) => article.product?.category).filter(Boolean)
      ] as string[])
    ).sort((left, right) => left.localeCompare(right))
    const queryLabel = deslugify(slug) || slug

    return (
      <PublicShell>
        <RouteRecoveryPanel
          kicker="Category Recovery"
          title="This exact category page is not populated yet."
          description="Bes3 could not find that exact category page yet, so this route points you to the nearest category, product, and review pages instead."
          queryLabel={queryLabel}
          searchHref={`/search?q=${encodeURIComponent(queryLabel)}&scope=products`}
          sections={[
            {
              eyebrow: 'Nearby categories',
              title: 'Closest category pages',
              links: findSuggestedCategories(categories, slug, 6).map((category) => ({
                href: buildCategoryPath(category),
                label: getCategoryLabel(category),
                note: 'Open the nearest live category page.'
              }))
            },
            {
              eyebrow: 'Nearby products',
              title: 'Likely product matches',
              links: findSuggestedProducts(allProducts, slug, 6)
                .filter((product) => product.slug)
                .map((product) => ({
                  href: `/products/${product.slug}`,
                  label: product.productName,
                  note: product.description || 'Open the closest product page.'
                }))
            },
            {
              eyebrow: 'Nearby reviews',
              title: 'Reviews, comparisons, and guides nearby',
              links: findSuggestedArticles(allArticles, slug, { limit: 6 }).map((article) => ({
                href: getArticlePath(article.type, article.slug),
                label: article.title,
                note: article.summary || 'Open the closest review or guide.'
              }))
            }
          ]}
        />
      </PublicShell>
    )
  }

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
  const path = buildCategoryPath(resolvedCategory)
  const categoryAlertHref = buildNewsletterPath({
    intent: 'category-brief',
    category: resolvedCategory,
    cadence: 'weekly',
    returnTo: path,
    returnLabel: `Resume ${categoryLabel}`,
    returnDescription: 'Come back to the same category page with your shortlist, reviews, and next-step context intact.'
  })
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Directory', path: '/directory' },
    { name: toTitleCaseWords(categoryLabel), path }
  ]
  const howToSteps = [
    {
      name: 'Shortlist the best options',
      text: 'Start with the strongest product cards when you still need the category narrowed into a few options worth saving.'
    },
    {
      name: 'Validate with a full review',
      text: featuredReview
        ? 'Open the lead review once one candidate already looks promising and you want product-fit context before comparing.'
        : 'Use the strongest available page in the category to see whether there is already enough here to act on.'
    },
    {
      name: 'Compare or track the category',
      text: 'Move into comparisons when the shortlist is tight. If price is the only thing holding you back, switch to category updates without losing your place.'
    }
  ]
  const structuredData = [
    buildBreadcrumbSchema(path, breadcrumbItems),
    buildCollectionPageSchema({
      path,
      title: `${toTitleCaseWords(categoryLabel)} Buying Guide`,
      description:
        pickMetadataDescription(featuredReview?.seoDescription, featuredReview?.summary, featured?.summary) ||
        `Browse ${categoryLabel} on Bes3 to find good products, read reviews, compare top picks, and start category updates without starting over.`,
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
    buildHowToSchema(path, `How to use the ${categoryLabel} category page`, 'Use the category page to shortlist good products, read the lead review, and compare or track the category.', howToSteps)
  ]
  const faqEntries = [
    {
      question: `What should this ${categoryLabel} page help me do?`,
      answer: `It should help you shop inside one ${categoryLabel} category: shortlist good products, open the lead review, compare top picks, and switch to category updates if price timing is the only thing holding you back.`
    },
    {
      question: 'When should I use a brand page from here?',
      answer: 'Open a brand page when one brand is already promising and you want every related product and page in one place. Stay here when cross-brand comparison still matters.'
    },
    {
      question: 'Why does this page push next moves instead of dumping every result?',
      answer: 'Because category pages should help you move forward. They should cut down the noise, not recreate a giant list that sends you back into broad browsing.'
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
      title: 'Read the lead review',
      description: 'Use the strongest review when one product is already catching your eye and you want fit and tradeoffs before comparing.',
      href: featuredReview ? getArticlePath(featuredReview.type, featuredReview.slug) : '/search',
      label: featuredReview ? 'Open lead review' : 'Search reviews'
    },
    {
      eyebrow: 'Decide',
      title: 'Compare top picks',
      description: 'Compare products that really belong together so the tradeoffs stay honest, especially once you already have two strong options.',
      href: featuredComparison ? getArticlePath(featuredComparison.type, featuredComparison.slug) : '/shortlist',
      label: featuredComparison ? 'Open category comparison' : 'Use shortlist compare'
    },
    {
      eyebrow: 'Watch',
      title: 'Track this category',
      description: 'If the purchase is not happening today, turn this category into a price watch or weekly update instead of losing your place.',
      href: categoryAlertHref,
      label: 'Start category updates'
    }
  ]
  const seoHubSections = [
    {
      id: 'category-products',
      eyebrow: 'Top products',
      title: `Good ${categoryLabel} products to open next`,
      description: 'Use these links when you want to move straight into the strongest product pages in this category.',
      links: products.slice(0, 4).map((product) => ({
        href: product.slug ? `/products/${product.slug}` : path,
        label: product.productName,
        note: product.description || `Open the ${categoryLabel} product page.`
      }))
    },
    {
      id: 'category-spokes',
      eyebrow: 'More ways to narrow it',
      title: 'Brand pages and reviews worth checking',
      description: 'Use these links if you want to stay with one brand or read a strong review before deciding.',
      links: [
        ...topBrands.slice(0, 2).map((brand) => ({
          href: buildBrandCategoryPath(brand.slug, resolvedCategory),
          label: `${brand.name} ${categoryLabel}`,
          note: 'Open the brand-specific page for this category.'
        })),
        ...articles.slice(0, 2).map((article) => ({
          href: getArticlePath(article.type, article.slug),
          label: article.title,
          note: article.summary || 'Open a strong review or guide next.'
        }))
      ]
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Category Page</p>
              <h1 className="font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-6xl">{categoryLabel}</h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-200">
                Bes3 uses this page to narrow the category into real product options, useful reviews, and the clearest next step.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Product pages</p>
                
                <p className="mt-3 text-3xl font-black">{products.length}</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Reviews + comparisons</p>
                <p className="mt-3 text-3xl font-black">{reviewCount + comparisonCount}</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200/85">Last checked</p>
                <p className="mt-3 text-lg font-black">{formatEditorialDate(latestRefresh, 'Still building')}</p>
                <p className="mt-2 text-sm leading-7 text-slate-200">
                  This refresh tells you whether the shortlist and supporting review coverage are current enough to act on now.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f8fbff_48%,#eefaf5_100%)] p-8 shadow-panel sm:p-10">
          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <p className="editorial-kicker">How To Use This Category</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Move from browsing to a shortlist you can actually use.</h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
                {categoryLabel} works best when you use it to shortlist good options, validate one product with a review, compare only the top picks, and switch to category updates if the purchase is still waiting.
              </p>
              <div className="mt-6 rounded-[1.75rem] bg-slate-950 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Best next step</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {products.length >= 2
                    ? 'This category already has enough products to shortlist and compare. Start with the top candidates below, then use a review or comparison page once the field is smaller.'
                    : 'This category is still early. Start with the strongest available product or review, then use category updates if you want to wait for more options.'}
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

        <DecisionSummaryPanel
          eyebrow="Decision Summary"
          title="Use this category page to narrow the market, then leave on purpose."
          description="A strong category page should answer four things fast: who belongs here, who should move on, why the page matters now, and what the clean next move is."
          items={[
            {
              eyebrow: 'Who should use this',
              title: 'Buyers who know the category, but not the best candidate yet',
              description: 'Use this page when the market is clear enough to stay inside one category, but you still need Bes3 to narrow it into products actually worth your attention.'
            },
            {
              eyebrow: 'Who should leave',
              title: featuredComparison ? 'Shortlists already down to finalists' : 'Shoppers with one clearly strong candidate already',
              description: featuredComparison
                ? 'Once the shortlist is tight, stop broad browsing and move into the comparison or lead review so the decision becomes concrete.'
                : 'If one candidate is already standing out, the category page has done its job. Open the lead review or product page instead of browsing sideways.',
              tone: 'muted'
            },
            {
              eyebrow: 'Why now',
              title: 'This page is the market-narrowing checkpoint',
              description: 'Use this page to shrink a crowded category into a handful of serious options before you compare, validate, or wait.'
            },
            {
              eyebrow: 'Next step',
              title: 'Validate, compare, or wait on purpose',
              description: 'If timing is the blocker, preserve the category with updates. If the field is already small enough, move into the strongest review, comparison, or product page instead.',
              tone: 'strong'
            }
          ]}
        />

        <SeoHubLinksPanel
          title="More pages worth checking"
          description="Use these links to open strong product pages, stay with one brand, or read a review before you decide."
          sections={seoHubSections}
        />

        {commerceProducts.length ? (
          <div id="category-shortlist">
            <ProductFinalistsSection
              products={commerceProducts}
              source="category-hub-shortlist"
              title="Start with the strongest buying options."
              description={`${categoryLabel} pages should not leave buyers with a loose product wall. Bes3 keeps the final category shortlist at three serious options max, then names the clearest lead.`}
              browseHref={buildCategoryPath(resolvedCategory)}
              browseLabel={`Browse ${categoryLabel}`}
              waitHref={categoryAlertHref}
              waitLabel="Start category updates"
            />
          </div>
        ) : null}

        {topBrands.length ? (
          <section className="rounded-[2.5rem] bg-white p-8 shadow-panel sm:p-10">
            <div className="flex flex-col gap-3 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="editorial-kicker">Top Brands</p>
                <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">Open the brand pages already active in this category.</h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                These brand pages help when one brand already looks promising but you still want to stay inside {categoryLabel}.
              </p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {topBrands.map((brand) => (
                <Link
                  key={brand.slug}
                  href={buildBrandCategoryPath(brand.slug, resolvedCategory)}
                  className="rounded-[1.75rem] bg-muted p-6 transition-colors hover:bg-emerald-50"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Brand + Category</p>
                  <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">
                    {brand.name} {categoryLabel}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {brand.count} live product {brand.count === 1 ? 'page' : 'pages'} already support this brand-specific view without making you start over.
                  </p>
                  <p className="mt-5 text-sm font-semibold text-primary">Open this view →</p>
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
                  <span>Featured page</span>
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
            <h2 className="font-[var(--font-display)] text-3xl font-black tracking-tight">More reviews are still on the way.</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Bes3 already recognizes this category, but the supporting review and comparison pages are still being expanded.
            </p>
          </div>
        )}

        <SeoFaqSection
          title={`${categoryLabel} page questions, answered clearly.`}
          entries={faqEntries}
          description="This FAQ explains what this category page is for and which next step makes sense from here."
        />
      </div>
    </PublicShell>
  )
}
