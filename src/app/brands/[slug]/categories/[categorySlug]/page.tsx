import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { BrandPolicyPanel } from '@/components/site/BrandPolicyPanel'
import { ProductSpotlightCard } from '@/components/site/ProductSpotlightCard'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { formatEditorialDate, getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata, pickMetadataDescription, toTitleCaseWords } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildHowToSchema } from '@/lib/structured-data'
import {
  getBrandBySlug,
  getBrandPolicyBySlug,
  getBrandSlug,
  listBrandCategoryHubs,
  listBrandCompatibilityFacts,
  listCategories,
  listPublishedArticles,
  listPublishedProducts
} from '@/lib/site-data'

interface RouteCard {
  eyebrow: string
  title: string
  description: string
  href: string
  label: string
}

export async function generateStaticParams() {
  const hubs = await listBrandCategoryHubs()

  return hubs.map((hub) => ({
    slug: hub.brandSlug,
    categorySlug: hub.category
  }))
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string; categorySlug: string }>
}): Promise<Metadata> {
  const { slug, categorySlug } = await params
  const path = `/brands/${slug}/categories/${categorySlug}`
  const [brand, categories, hubs] = await Promise.all([getBrandBySlug(slug), listCategories(), listBrandCategoryHubs()])
  const hasCategory = categories.includes(categorySlug)
  const hub = hubs.find((entry) => entry.brandSlug === slug && entry.category === categorySlug) || null
  const categoryLabel = getCategoryLabel(categorySlug)

  if (!brand || !hasCategory) {
    return buildPageMetadata({
      title: 'Page Not Found',
      description: 'This Bes3 brand-and-category page is unavailable.',
      path,
      locale: getRequestLocale(),
      robots: {
        index: false,
        follow: false
      }
    })
  }

  const hasDirectCoverage = Boolean(hub)
  const description = hasDirectCoverage
    ? pickMetadataDescription(hub?.description) ||
      `Browse ${brand.name} ${categoryLabel} coverage on Bes3 to see products, reviews, and next-step links in one place.`
    : `Bes3 is still building direct ${brand.name} ${categoryLabel} coverage. Use this page to recover through the closest brand and category alternatives without restarting research.`

  return buildPageMetadata({
    title: `${brand.name} ${toTitleCaseWords(categoryLabel)} Buying Guide`,
    description,
    path,
    locale: getRequestLocale(),
    image: hub?.heroImageUrl || brand.heroImageUrl,
    category: categoryLabel,
    freshnessDate: hub?.latestUpdate || brand.latestUpdate,
    freshnessInTitle: true,
    keywords: [brand.name, categoryLabel, `${brand.name} ${categoryLabel}`, `${brand.name} ${categoryLabel} reviews`],
    robots: hasDirectCoverage
      ? undefined
      : {
          index: false,
          follow: true
        }
  })
}

export default async function BrandCategoryPage({
  params
}: {
  params: Promise<{ slug: string; categorySlug: string }>
}) {
  const { slug, categorySlug } = await params
  const path = `/brands/${slug}/categories/${categorySlug}`
  const [brand, categories, hubs, allArticles, allProducts, brandPolicy, compatibilityFacts] = await Promise.all([
    getBrandBySlug(slug),
    listCategories(),
    listBrandCategoryHubs(),
    listPublishedArticles(),
    listPublishedProducts(),
    getBrandPolicyBySlug(slug),
    listBrandCompatibilityFacts(slug, { category: categorySlug, limit: 6 })
  ])
  const hasCategory = categories.includes(categorySlug)

  if (!brand || !hasCategory) notFound()

  const hub = hubs.find((entry) => entry.brandSlug === slug && entry.category === categorySlug) || null
  const categoryLabel = getCategoryLabel(categorySlug)
  const directProducts = allProducts.filter((product) => product.category === categorySlug && getBrandSlug(product.brand) === slug)
  const directArticles = allArticles.filter((article) => article.product?.category === categorySlug && getBrandSlug(article.product?.brand) === slug)
  const sameBrandLanes = hubs.filter((entry) => entry.brandSlug === slug && entry.category !== categorySlug).slice(0, 4)
  const sameCategoryLanes = hubs.filter((entry) => entry.category === categorySlug && entry.brandSlug !== slug).slice(0, 4)
  const fallbackProducts = [
    ...allProducts.filter((product) => product.category === categorySlug && getBrandSlug(product.brand) !== slug),
    ...allProducts.filter((product) => product.category !== categorySlug && getBrandSlug(product.brand) === slug)
  ].slice(0, 3)
  const fallbackArticles = [
    ...allArticles.filter((article) => article.product?.category === categorySlug && getBrandSlug(article.product?.brand) !== slug),
    ...allArticles.filter((article) => article.product?.category !== categorySlug && getBrandSlug(article.product?.brand) === slug)
  ].slice(0, 4)
  const hasDirectCoverage = directProducts.length > 0 || directArticles.length > 0
  const leadProduct = directProducts[0] || fallbackProducts[0] || null
  const leadReview = directArticles.find((article) => article.type === 'review') || directArticles[0] || fallbackArticles[0] || null
  const leadComparison = directArticles.find((article) => article.type === 'comparison') || null
  const latestRefresh =
    hub?.latestUpdate ||
    leadReview?.updatedAt ||
    leadReview?.publishedAt ||
    leadReview?.createdAt ||
    leadProduct?.updatedAt ||
    leadProduct?.publishedAt ||
    brand.latestUpdate ||
    null
  const collectionItems = [
    ...(directProducts.length ? directProducts : fallbackProducts).slice(0, 6).map((product) => ({
      name: product.productName,
      path: product.slug ? `/products/${product.slug}` : `/brands/${slug}`
    })),
    ...(directArticles.length ? directArticles : fallbackArticles).slice(0, 6).map((article) => ({
      name: article.title,
      path: getArticlePath(article.type, article.slug)
    }))
  ]
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Brands', path: '/brands' },
    { name: brand.name, path: `/brands/${brand.slug}` },
    { name: toTitleCaseWords(categoryLabel), path }
  ]
  const faqEntries = hasDirectCoverage
    ? [
        {
          question: `What does the ${brand.name} ${categoryLabel} page include?`,
          answer: `It pulls the current ${brand.name} coverage inside the ${categoryLabel} category into one place, so buyers can open matching products, reviews, and the next step without widening the search too early.`
        },
        {
          question: `When should I leave the ${brand.name} ${categoryLabel} page?`,
          answer: `Leave it when either the brand filter or the category filter stops being useful. Reopen the broader brand page if you still trust ${brand.name}, or reopen the ${categoryLabel} category page if cross-brand comparison matters more.`
        },
        {
          question: 'Why create a dedicated brand-category page instead of linking only to brand and category pages?',
          answer: 'Because many shoppers search by both brand and category at the same time. This page meets that need directly and keeps the next click closer to a real choice.'
        }
      ]
    : [
        {
          question: `Why is direct ${brand.name} ${categoryLabel} coverage not shown yet?`,
          answer: `Bes3 recognizes both the brand and the category, but the exact overlap is still building. Rather than drop the buyer into a dead end, this page keeps the closest alternatives in one place.`
        },
        {
          question: 'What should I do while this exact page is still thin?',
          answer: `Use the broader ${brand.name} page if brand preference is still strong, or reopen the ${categoryLabel} category page if the category matters more than the brand right now.`
        },
        {
          question: 'Will this page grow over time?',
          answer: 'Yes. As more direct products and editorial coverage appear for this combination, this page can grow naturally without changing where you shop.'
        }
      ]
  const routeCards: RouteCard[] = hasDirectCoverage
    ? [
        leadProduct
          ? {
              eyebrow: 'Start',
              title: `Open the lead ${brand.name} pick`,
              description: `Begin with the strongest ${categoryLabel} product page if you already trust ${brand.name} and want the shortest path into specs, pricing, and shortlist actions.`,
              href: leadProduct.slug ? `/products/${leadProduct.slug}` : `/brands/${slug}`,
              label: 'Open product details'
            }
          : {
              eyebrow: 'Start',
              title: `Open the ${brand.name} page`,
              description: 'Use the broader brand page when you still want all brand coverage together before narrowing inside one category.',
              href: `/brands/${slug}`,
              label: 'Open brand page'
            },
        leadReview
          ? {
              eyebrow: 'Validate',
              title: 'Read the clearest review',
              description: 'Use the review or guide once one product already looks promising and you want fit context before comparing or clicking out.',
              href: getArticlePath(leadReview.type, leadReview.slug),
              label: 'Open review'
            }
          : {
              eyebrow: 'Validate',
              title: `Reopen ${brand.name} coverage`,
              description: 'If coverage is still thin here, return to the brand page to see the strongest brand-level options and reviews.',
              href: `/brands/${slug}`,
              label: 'Open brand page'
            },
        leadComparison
          ? {
              eyebrow: 'Compare',
              title: 'Compare the top picks',
              description: 'Use the comparison once there are multiple strong options inside this exact page and you want the tradeoffs condensed into one answer.',
              href: getArticlePath(leadComparison.type, leadComparison.slug),
              label: 'Open comparison'
            }
          : {
              eyebrow: 'Compare',
              title: `Browse ${categoryLabel}`,
              description: `Return to the broader ${categoryLabel} category page when you need to widen the field across brands before deciding whether ${brand.name} still belongs in the shortlist.`,
              href: `/categories/${categorySlug}`,
              label: 'Open category page'
            },
        {
          eyebrow: 'Watch',
          title: `Track ${categoryLabel}`,
          description: 'If price is the only thing holding you back, keep this category active through alerts instead of forcing a decision today.',
          href: `/newsletter?intent=price-alert&category=${encodeURIComponent(categorySlug)}&brand=${encodeURIComponent(brand.name)}&cadence=priority`,
          label: 'Start price watch'
        }
      ]
    : [
        {
          eyebrow: 'Recover',
          title: `Reopen the ${brand.name} page`,
          description: `Use the broader ${brand.name} page when brand preference is still valid but this exact ${categoryLabel} page has not filled in yet.`,
          href: `/brands/${slug}`,
          label: 'Open brand page'
        },
        {
          eyebrow: 'Widen',
          title: `Reopen ${categoryLabel}`,
          description: `Return to the full ${categoryLabel} category page when the category matters more than the brand and you need the strongest alternatives now.`,
          href: `/categories/${categorySlug}`,
          label: 'Open category page'
        },
        {
          eyebrow: 'Track',
          title: `Track ${categoryLabel}`,
          description: 'If the exact overlap is not ready, keep the broader category active so new coverage or price movement does not disappear from your radar.',
          href: `/newsletter?intent=category-brief&category=${encodeURIComponent(categorySlug)}&brand=${encodeURIComponent(brand.name)}&cadence=weekly`,
          label: 'Start category alerts'
        },
        {
          eyebrow: 'Search',
          title: 'Search adjacent coverage',
          description: 'Use search when your need may be broader than this page and you want the fastest way back to useful results.',
          href: `/search?q=${encodeURIComponent(`${brand.name} ${categoryLabel}`)}&scope=products`,
          label: 'Search the archive'
        }
      ]
  const structuredData = [
    buildBreadcrumbSchema(path, breadcrumbItems),
    buildCollectionPageSchema({
      path,
      title: `${brand.name} ${toTitleCaseWords(categoryLabel)} Buying Guide`,
      description: hasDirectCoverage
        ? pickMetadataDescription(hub?.description) ||
          `Browse ${brand.name} ${categoryLabel} coverage on Bes3 to see products, reviews, and next-step links in one place.`
        : `Bes3 is still building direct ${brand.name} ${categoryLabel} coverage. Use this page to recover through the closest brand and category alternatives without restarting research.`,
      image: hub?.heroImageUrl || brand.heroImageUrl,
      breadcrumbItems,
      dateModified: latestRefresh,
      about: [
        {
          '@type': 'Brand',
          name: brand.name
        },
        {
          '@type': 'Thing',
          name: categoryLabel
        }
      ],
      items: collectionItems
    }),
    buildHowToSchema(
      path,
      `How to use the ${brand.name} ${categoryLabel} page`,
      hasDirectCoverage
        ? 'Use the page to start with the strongest product, validate with nearby editorial, and widen the field only if the exact overlap stops being useful.'
        : 'Use the fallback page to recover through the nearest brand and category pages while direct coverage is still being built.',
      hasDirectCoverage
        ? [
            {
              name: 'Start with the exact product match',
              text: `Open the strongest ${brand.name} ${categoryLabel} product page when you already trust the brand and want the shortest path into specifics.`
            },
            {
              name: 'Validate with nearby editorial',
              text: 'Use the attached review, guide, or comparison once one candidate already looks promising and you want the recommendation condensed into one page.'
            },
            {
              name: 'Widen only if this page stops helping',
              text: `Return to the broader brand or category page only when either the brand filter or the category filter stops helping the decision.`
            }
          ]
        : [
            {
              name: 'Recover through the brand page',
              text: `Start with the wider ${brand.name} page when brand trust is still intact and you need the closest coverage first.`
            },
            {
              name: 'Recover through the category page',
              text: `Use the full ${categoryLabel} page when the category matters more than the brand and you need active alternatives immediately.`
            },
            {
              name: 'Keep this search alive with alerts',
              text: 'If neither fallback path should trigger a purchase today, track the category so new coverage or price movement can pull you back in later.'
            }
          ]
    ),
    buildFaqSchema(path, faqEntries)
  ]

  return (
    <PublicShell>
      <StructuredData data={structuredData} />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] p-8 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.8)] sm:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div>
              <Link href={`/brands/${brand.slug}`} className="inline-flex text-sm font-medium text-white/75 transition-colors hover:text-white">
                Brands / {brand.name} / {toTitleCaseWords(categoryLabel)}
              </Link>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Brand + Category</p>
              <h1 className="mt-3 font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-6xl">
                {brand.name} {toTitleCaseWords(categoryLabel)}
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-200">
                {hasDirectCoverage
                  ? hub?.description || `This page helps buyers who already know both the brand and the category move straight to the most useful next step without reopening a broad search.`
                  : `Direct ${brand.name} ${categoryLabel} coverage is still building. This page still gives you the nearest next steps so your research does not hit a dead end.`}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-200/85">Matching products</p>
                  <p className="mt-2 text-2xl font-black">{directProducts.length}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-200/85">Editorial pages</p>
                  <p className="mt-2 text-2xl font-black">{directArticles.length}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-200/85">Last checked</p>
                  <p className="mt-2 text-lg font-black">{formatEditorialDate(latestRefresh, 'Coverage building')}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {routeCards.map((route) => (
                <Link
                  key={route.title}
                  href={route.href}
                  className="rounded-[1.75rem] bg-white p-6 text-foreground shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition-transform hover:-translate-y-1"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{route.eyebrow}</p>
                  <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight">{route.title}</h2>
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
          compact
          title="Brand policy knowledge"
          description={`Bes3 keeps brand-level policy and compatibility context here so ${brand.name} ${categoryLabel} buyers can resolve shipping, warranty, and setup questions without reopening broad search.`}
        />

        {(directProducts.length || fallbackProducts.length) ? (
          <section className="space-y-6">
            <div>
              <p className="editorial-kicker">{hasDirectCoverage ? 'Exact Match' : 'Closest Live Options'}</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">
                {hasDirectCoverage ? `Start with the strongest ${brand.name} ${categoryLabel} picks.` : `Use adjacent products while ${brand.name} ${categoryLabel} coverage grows.`}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                {hasDirectCoverage
                  ? 'These products already match this exact brand-and-category search. Start here when you want the shortest path from this search to a product choice.'
                  : 'These fallback options keep this page useful even before the exact match is fully populated. They keep either the brand or the category in view instead of sending buyers back to a broad search.'}
              </p>
            </div>
            <div className="grid gap-6 xl:grid-cols-3">
              {(directProducts.length ? directProducts : fallbackProducts).slice(0, 3).map((product) => (
                <ProductSpotlightCard
                  key={product.id}
                  product={product}
                  source={hasDirectCoverage ? 'brand-category-hub-shortlist' : 'brand-category-hub-recovery'}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[2rem] bg-white p-8 shadow-panel">
            <p className="editorial-kicker">Same Brand</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Other active pages for {brand.name}.</h2>
            <div className="mt-6 space-y-3">
              {sameBrandLanes.map((lane) => (
                <Link
                  key={lane.category}
                  href={`/brands/${brand.slug}/categories/${lane.category}`}
                  className="block rounded-[1.5rem] bg-muted px-5 py-4 transition-colors hover:bg-emerald-50"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Brand + Category</p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">{brand.name} {toTitleCaseWords(getCategoryLabel(lane.category))}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {lane.productCount} published product {lane.productCount === 1 ? 'page' : 'pages'} and {lane.articleCount} editorial {lane.articleCount === 1 ? 'page' : 'pages'} already support this nearby option.
                  </p>
                </Link>
              ))}
              {!sameBrandLanes.length ? (
                <p className="text-sm leading-7 text-muted-foreground">
                  {brand.name} is still concentrated on this one page. Reopen the full brand page if you need the broader view before coverage expands.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-8 shadow-panel">
            <p className="editorial-kicker">Same Category</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Other brands already active in {categoryLabel}.</h2>
            <div className="mt-6 space-y-3">
              {sameCategoryLanes.map((lane) => (
                <Link
                  key={lane.brandSlug}
                  href={`/brands/${lane.brandSlug}/categories/${categorySlug}`}
                  className="block rounded-[1.5rem] bg-muted px-5 py-4 transition-colors hover:bg-emerald-50"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Category Match</p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">{lane.brandName} {toTitleCaseWords(categoryLabel)}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {lane.productCount} published product {lane.productCount === 1 ? 'page' : 'pages'} and {lane.articleCount} editorial {lane.articleCount === 1 ? 'page' : 'pages'} give you another option if you look beyond {brand.name}.
                  </p>
                </Link>
              ))}
              {!sameCategoryLanes.length ? (
                <p className="text-sm leading-7 text-muted-foreground">
                  No other brand + category page is available here yet. Use the broader category page to keep your options open while Bes3 adds more coverage.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-8 shadow-panel">
          <div className="flex flex-col gap-3 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="editorial-kicker">{hasDirectCoverage ? 'Live Coverage' : 'Recovery Coverage'}</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">
                {hasDirectCoverage ? 'Editorial already published for this exact page.' : 'Editorial pages that keep this search useful.'}
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              {hasDirectCoverage
                ? 'These pages support this exact brand-and-category search instead of forcing buyers back into a broad archive.'
                : 'Even when this exact combination is not ready, Bes3 can still show the nearest reviews instead of dropping you into an empty page.'}
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {(directArticles.length ? directArticles : fallbackArticles).slice(0, 4).map((article) => (
              <Link
                key={article.id}
                href={getArticlePath(article.type, article.slug)}
                className="rounded-[1.5rem] bg-muted p-6 transition-colors hover:bg-emerald-50"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{article.type}</p>
                <h3 className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-foreground">{article.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{article.summary}</p>
              </Link>
            ))}
            {!directArticles.length && !fallbackArticles.length ? (
              <p className="text-sm leading-7 text-muted-foreground">
                Editorial support for this page is still being assembled. Use the cards above to recover through the broader brand or category pages instead of restarting the search.
              </p>
            ) : null}
          </div>
        </section>

        <SeoFaqSection
          title={`${brand.name} ${toTitleCaseWords(categoryLabel)} questions, answered fast.`}
          entries={faqEntries}
          description="This page explains when this brand-and-category view is useful and where to go next."
        />
      </div>
    </PublicShell>
  )
}
