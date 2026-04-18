import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { BrandPolicyPanel } from '@/components/site/BrandPolicyPanel'
import { ProductFinalistsSection } from '@/components/site/ProductFinalistsSection'
import { RouteRecoveryPanel } from '@/components/site/RouteRecoveryPanel'
import { SeoHubLinksPanel } from '@/components/site/SeoHubLinksPanel'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { buildBrandCategoryPath, buildCategoryPath, categoryMatches, getCategorySlug } from '@/lib/category'
import { formatEditorialDate, getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata, pickMetadataDescription } from '@/lib/metadata'
import { buildNewsletterPath } from '@/lib/newsletter-path'
import { deslugify, findSuggestedBrands, findSuggestedCategories, findSuggestedProducts } from '@/lib/route-recovery'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildHowToSchema } from '@/lib/structured-data'
import {
  getBrandBySlug,
  getBrandSlug,
  getBrandPolicyBySlug,
  listBrandCompatibilityFacts,
  listBrands,
  listCategories,
  listOpenCommerceProducts,
  listPublishedArticles
} from '@/lib/site-data'

function resolveLeadBrandCategory(
  products: Awaited<ReturnType<typeof listOpenCommerceProducts>>,
  fallbackCategories: string[]
) {
  const buckets = new Map<string, { label: string; count: number; firstIndex: number }>()
  const fallbackOrder = new Map(
    fallbackCategories
      .map((category, index) => [getCategorySlug(category), index] as const)
      .filter(([slug]) => Boolean(slug))
  )

  products.forEach((product, index) => {
    const slug = getCategorySlug(product.category)
    if (!slug) return

    const existing = buckets.get(slug)
    if (existing) {
      existing.count += 1
      return
    }

    buckets.set(slug, {
      label: product.category || slug,
      count: 1,
      firstIndex: index
    })
  })

  const winner = Array.from(buckets.entries())
    .sort((left, right) => {
      const countDelta = right[1].count - left[1].count
      if (countDelta !== 0) return countDelta

      const fallbackDelta =
        (fallbackOrder.get(left[0]) ?? Number.MAX_SAFE_INTEGER) -
        (fallbackOrder.get(right[0]) ?? Number.MAX_SAFE_INTEGER)
      if (fallbackDelta !== 0) return fallbackDelta

      return left[1].firstIndex - right[1].firstIndex
    })[0]

  return winner?.[1].label || fallbackCategories[0] || ''
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const slug = (await params).slug
  const brand = await getBrandBySlug(slug)

  if (!brand) {
    return buildPageMetadata({
      title: `${deslugify(slug) || 'Brand'} Recovery`,
      description: 'The exact Bes3 brand page is unavailable. Use nearby brand, category, and product routes instead of ending on a dead page.',
      path: `/brands/${slug}`,
      locale: getRequestLocale(),
      robots: {
        index: false,
        follow: true
      }
    })
  }

  return buildPageMetadata({
    title: `${brand.name} Buying Guide`,
    description:
      pickMetadataDescription(brand.description) ||
      `Browse ${brand.name} products, reviews, comparisons, and active categories on Bes3 without reopening broad search.`,
    path: `/brands/${brand.slug}`,
    locale: getRequestLocale(),
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
  const brand = await getBrandBySlug(slug)

  if (!brand) {
    const [brands, categories, products] = await Promise.all([listBrands(), listCategories(), listOpenCommerceProducts()])
    const queryLabel = deslugify(slug) || slug

    return (
      <PublicShell>
        <RouteRecoveryPanel
          kicker="Brand Recovery"
          title="This exact brand page is not published."
          description="Bes3 could not find that exact brand page, so this route points you to the closest brands, categories, and products instead."
          queryLabel={queryLabel}
          searchHref={`/search?q=${encodeURIComponent(queryLabel)}&scope=products`}
          sections={[
            {
              eyebrow: 'Nearby brands',
              title: 'Closest brand pages',
              links: findSuggestedBrands(brands, slug, 6).map((candidate) => ({
                href: `/brands/${candidate.slug}`,
                label: candidate.name,
                note: `${candidate.productCount} products and ${candidate.articleCount} review pages are already live on Bes3.`
              }))
            },
            {
              eyebrow: 'Nearby categories',
              title: 'Category routes that may match',
              links: findSuggestedCategories(categories, slug, 6).map((category) => ({
                href: buildCategoryPath(category),
                label: getCategoryLabel(category),
                note: 'Open the category page if the brand was wrong but the product type is still right.'
              }))
            },
            {
              eyebrow: 'Nearby products',
              title: 'Likely product matches',
              links: findSuggestedProducts(products, slug, 6)
                .filter((product) => product.slug)
                .map((product) => ({
                  href: `/products/${product.slug}`,
                  label: product.productName,
                  note: product.description || 'Open the strongest nearby product page.'
                }))
            }
          ]}
        />
      </PublicShell>
    )
  }

  const [allArticles, allCommerceProducts, brandPolicy, compatibilityFacts] = await Promise.all([
    listPublishedArticles(),
    listOpenCommerceProducts(),
    getBrandPolicyBySlug(slug),
    listBrandCompatibilityFacts(slug, { limit: 6 })
  ])

  const brandProducts = allCommerceProducts.filter((product) => getBrandSlug(product.brand) === slug)
  const leadCategory = resolveLeadBrandCategory(brandProducts, brand.categories)
  const brandCommerceProducts = leadCategory
    ? brandProducts.filter((product) => categoryMatches(product.category, leadCategory))
    : brandProducts
  const leadBrandProduct = brandCommerceProducts[0] || brandProducts[0] || null
  const brandArticles = allArticles.filter((article) => getBrandSlug(article.product?.brand) === slug)
  const leadReview = brandArticles.find((article) => article.type === 'review') || brandArticles[0] || null
  const leadComparison = brandArticles.find((article) => article.type === 'comparison') || null
  const faqEntries = [
    {
      question: `What does the ${brand.name} page include?`,
      answer: `It groups the live ${brand.name} product pages, reviews, comparisons, and category links that Bes3 has already published, so shoppers can stay focused on one brand.`
    },
    {
      question: `When should I leave the ${brand.name} page and return to a category page?`,
      answer: `Leave the brand page when the brand no longer feels like the right constraint. Category pages are better once you need honest cross-brand tradeoffs.`
    },
    {
      question: `What is the best next move after this brand page?`,
      answer: leadComparison
        ? 'Use the live comparison if the shortlist is already tight. Otherwise start with the strongest product or review, then come back to the category page only if you need wider context.'
        : 'Start with the strongest product or review on this page. If there is not enough here yet, return to the category page to keep the shortlist broader.'
    }
  ]
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Brands', path: '/brands' },
    { name: brand.name, path: `/brands/${brand.slug}` }
  ]
  const brandPath = `/brands/${brand.slug}`
  const leadCategoryPath = leadCategory ? buildBrandCategoryPath(brand.slug, leadCategory) : brandPath
  const brandWaitPath = buildNewsletterPath({
    intent: leadCategory ? 'price-alert' : 'offers',
    category: leadCategory || '',
    cadence: 'priority',
    returnTo: brandPath,
    returnLabel: `Resume ${brand.name}`,
    returnDescription: `Return to the ${brand.name} page with the same brand context and next-step routes still intact.`
  })
  const structuredData = [
    buildBreadcrumbSchema(brandPath, breadcrumbItems),
    buildCollectionPageSchema({
      path: brandPath,
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
      brandPath,
      `How to use the ${brand.name} brand page`,
      'Use the brand page to start with the strongest product, validate the brand with a review, and go back to category comparisons only if your search broadens.',
      [
        {
          name: 'Start with the strongest product',
          text: 'Open the strongest product page when you already trust the brand and want the shortest path into specs, price context, and shortlist actions.'
        },
        {
          name: 'Validate with brand reviews',
          text: 'Use the review or comparison pages tied to this brand once you need a clearer fit check or a head-to-head comparison.'
        },
        {
          name: 'Return to categories when needed',
          text: 'If the brand no longer feels like the right constraint, reopen the related category pages so you can compare across brands without losing your place.'
        }
      ]
    ),
    buildFaqSchema(brandPath, faqEntries)
  ]
  const brandRoutes = [
    leadBrandProduct
      ? {
          eyebrow: 'Start',
          title: `Open the lead ${brand.name} product`,
          description: 'Begin with the strongest current product page if you already trust the brand and want the cleanest next step into specs, pricing, and shortlist actions.',
          href: leadBrandProduct.slug ? `/products/${leadBrandProduct.slug}` : leadCategoryPath,
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
          description: 'The comparison page is best when this brand already has multiple strong options and you want the tradeoffs condensed into one answer.',
          href: getArticlePath(leadComparison.type, leadComparison.slug),
          label: 'Open comparison'
        }
      : leadCategory
        ? {
            eyebrow: 'Explore',
            title: `Open ${brand.name} in ${getCategoryLabel(leadCategory)}`,
            description: 'Use the brand-and-category view when both filters already matter and you want the shortest path into matching products and next steps.',
            href: buildBrandCategoryPath(brand.slug, leadCategory),
            label: 'Open this view'
          }
        : null,
    leadCategory
      ? {
          eyebrow: 'Watch',
          title: `Track ${getCategoryLabel(leadCategory)}`,
          description: 'If price is the only thing holding you back, keep the surrounding category active instead of forcing a brand choice today.',
          href: brandWaitPath,
          label: 'Start price watch'
        }
      : null
  ].filter(Boolean) as Array<{
    eyebrow: string
    title: string
    description: string
    href: string
    label: string
  }>
  const seoHubSections = [
    {
      id: 'brand-categories',
      eyebrow: 'Brand by category',
      title: `${brand.name} pages by category`,
      description: 'Use these links when you already trust the brand and want to jump into the right category faster.',
      links: brand.categories.slice(0, 4).map((category) => ({
        href: buildBrandCategoryPath(brand.slug, category),
        label: `${brand.name} ${getCategoryLabel(category)}`,
        note: 'Open the brand-specific page for this category.'
      }))
    },
    {
      id: 'brand-editorial',
      eyebrow: 'Best next pages',
      title: 'Top product pages and reviews',
      description: 'Use these links to open the strongest product pages or read a review before buying.',
      links: [
        ...brandProducts.slice(0, 2).map((product) => ({
          href: product.slug ? `/products/${product.slug}` : `/brands/${brand.slug}`,
          label: product.productName,
          note: product.description || 'Open the strongest current product page.'
        })),
        ...brandArticles.slice(0, 2).map((article) => ({
          href: getArticlePath(article.type, article.slug),
          label: article.title,
          note: article.summary || 'Open the closest review or comparison next.'
        }))
      ]
    }
  ]

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
                {brand.description || `This page collects the current ${brand.name} products, reviews, and category pages available on Bes3.`}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Products</p>
                  <p className="mt-2 text-2xl font-black text-foreground">{brand.productCount}</p>
                </div>
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Reviews + comparisons</p>
                  <p className="mt-2 text-2xl font-black text-foreground">{brand.articleCount}</p>
                </div>
                <div className="rounded-[1.5rem] bg-white p-5 shadow-panel">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Last checked</p>
                  <p className="mt-2 text-lg font-black text-foreground">{formatEditorialDate(brand.latestUpdate, 'Still building')}</p>
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

        <BrandPolicyPanel
          brandName={brand.name}
          policy={brandPolicy}
          compatibilityFacts={compatibilityFacts}
          title="After-you-buy details"
          description="Bes3 uses these stored policy and compatibility notes to answer the questions product specs alone cannot settle: shipping, returns, warranty, and setup fit."
        />

        <SeoHubLinksPanel
          title="More pages worth checking"
          description="Use these links to jump into the right category, open a strong product page, or read a review before deciding."
          sections={seoHubSections}
        />

        {brandCommerceProducts.length ? (
          <ProductFinalistsSection
            products={brandCommerceProducts}
            source="brand-hub-shortlist"
            title={leadCategory ? `Start with the strongest ${brand.name} ${getCategoryLabel(leadCategory)} picks.` : `Start with the strongest ${brand.name} picks.`}
            description={leadCategory
              ? `This brand page resolves the final recommendation layer inside ${getCategoryLabel(leadCategory)} first: at most three same-category ${brand.name} picks, one lead, and a clear route into compare or price watch.`
              : `This brand page keeps the final recommendation layer small on purpose: at most three ${brand.name} products in view, one lead, and a clear route into compare or price watch if you are not ready to buy.`}
            browseHref={leadCategoryPath}
            browseLabel={leadCategory ? `Browse ${brand.name} ${getCategoryLabel(leadCategory)}` : `Browse ${brand.name}`}
            waitHref={brandWaitPath}
            waitLabel={leadCategory ? `Track ${getCategoryLabel(leadCategory)}` : 'Start price watch'}
          />
        ) : null}

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] bg-white p-8 shadow-panel">
            <p className="editorial-kicker">Category Spread</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">See where {brand.name} is already active.</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {brand.categories.map((category) => (
                <Link
                  key={category}
                  href={buildBrandCategoryPath(brand.slug, category)}
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
            <p className="editorial-kicker">Reviews and Comparisons</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Reviews and comparisons already published.</h2>
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
                  More reviews for {brand.name} are still being added. Use the product pages above or return to category pages for broader options.
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
