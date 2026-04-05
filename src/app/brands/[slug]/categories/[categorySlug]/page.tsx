import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/layout/PublicShell'
import { ProductSpotlightCard } from '@/components/site/ProductSpotlightCard'
import { SeoFaqSection } from '@/components/site/SeoFaqSection'
import { StructuredData } from '@/components/site/StructuredData'
import { getArticlePath } from '@/lib/article-path'
import { formatEditorialDate, getCategoryLabel } from '@/lib/editorial'
import { buildPageMetadata, pickMetadataDescription, toTitleCaseWords } from '@/lib/metadata'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildHowToSchema } from '@/lib/structured-data'
import { getBrandSlug, listBrandCategoryHubs, listBrands, listCategories, listPublishedArticles, listPublishedProducts } from '@/lib/site-data'

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
  const [brands, categories, hubs] = await Promise.all([listBrands(), listCategories(), listBrandCategoryHubs()])
  const brand = brands.find((entry) => entry.slug === slug) || null
  const hasCategory = categories.includes(categorySlug)
  const hub = hubs.find((entry) => entry.brandSlug === slug && entry.category === categorySlug) || null
  const categoryLabel = getCategoryLabel(categorySlug)

  if (!brand || !hasCategory) {
    return buildPageMetadata({
      title: 'Route Not Found',
      description: 'This Bes3 brand-category lane is unavailable.',
      path,
      robots: {
        index: false,
        follow: false
      }
    })
  }

  const hasDirectCoverage = Boolean(hub)
  const description = hasDirectCoverage
    ? pickMetadataDescription(hub?.description) ||
      `Browse ${brand.name} ${categoryLabel} coverage on Bes3 to see live products, verdicts, and next-step links inside one buyer-intent lane.`
    : `Bes3 is still building direct ${brand.name} ${categoryLabel} coverage. Use this route to recover through the closest live brand and category alternatives without restarting research.`

  return buildPageMetadata({
    title: `${brand.name} ${toTitleCaseWords(categoryLabel)} Buying Guide`,
    description,
    path,
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
  const [brands, categories, hubs, allArticles, allProducts] = await Promise.all([
    listBrands(),
    listCategories(),
    listBrandCategoryHubs(),
    listPublishedArticles(),
    listPublishedProducts()
  ])
  const brand = brands.find((entry) => entry.slug === slug) || null
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
          question: `What does the ${brand.name} ${categoryLabel} lane include?`,
          answer: `It compresses the current ${brand.name} coverage inside the ${categoryLabel} category, so buyers can open exact products, live verdicts, and the next routing step without widening the research lane too early.`
        },
        {
          question: `When should I leave the ${brand.name} ${categoryLabel} lane?`,
          answer: `Leave it when either the brand constraint or the category constraint stops being useful. Reopen the broader brand hub if you still trust ${brand.name}, or reopen the ${categoryLabel} category hub if cross-brand comparison matters more.`
        },
        {
          question: 'Why create a dedicated brand-category page instead of linking only to brand and category hubs?',
          answer: 'Because long-tail buyers often search with both constraints already in mind. This page matches that intent directly and keeps the next click closer to a real decision.'
        }
      ]
    : [
        {
          question: `Why is direct ${brand.name} ${categoryLabel} coverage not shown yet?`,
          answer: `Bes3 recognizes both the brand and the category, but the exact overlap is still building. Rather than drop the buyer into a dead end, this route keeps the closest live alternatives in one place.`
        },
        {
          question: 'What should I do while this exact lane is still thin?',
          answer: `Use the broader ${brand.name} hub if brand preference is still strong, or reopen the ${categoryLabel} category hub if the category matters more than the manufacturer right now.`
        },
        {
          question: 'Will this page become a full landing page later?',
          answer: 'Yes. Once direct products or editorial coverage appear for this combination, the same route can graduate into an indexed long-tail landing page without changing the information architecture.'
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
              label: 'Open product deep-dive'
            }
          : {
              eyebrow: 'Start',
              title: `Open the ${brand.name} hub`,
              description: 'Use the broader brand route when you still want all brand coverage together before narrowing inside one category.',
              href: `/brands/${slug}`,
              label: 'Open brand hub'
            },
        leadReview
          ? {
              eyebrow: 'Validate',
              title: 'Read the clearest verdict',
              description: 'Use the live review or guide once one product already looks plausible and you want buyer-fit context before comparing or clicking out.',
              href: getArticlePath(leadReview.type, leadReview.slug),
              label: 'Open editorial verdict'
            }
          : {
              eyebrow: 'Validate',
              title: `Reopen ${brand.name} coverage`,
              description: 'If editorial is still thin in this exact lane, return to the brand hub to recover the strongest brand-level buying context.',
              href: `/brands/${slug}`,
              label: 'Open brand hub'
            },
        leadComparison
          ? {
              eyebrow: 'Compare',
              title: 'Pressure-test the finalists',
              description: 'Use the comparison route once there are multiple credible options inside this exact lane and you want the tradeoffs condensed into one answer.',
              href: getArticlePath(leadComparison.type, leadComparison.slug),
              label: 'Open comparison'
            }
          : {
              eyebrow: 'Compare',
              title: `Reopen ${categoryLabel}`,
              description: `Return to the broader ${categoryLabel} hub when you need to widen the field across brands before deciding whether ${brand.name} still belongs in the shortlist.`,
              href: `/categories/${categorySlug}`,
              label: 'Open category hub'
            },
        {
          eyebrow: 'Watch',
          title: `Track ${categoryLabel}`,
          description: 'If timing is the blocker, keep this category active through alerts instead of forcing the decision today.',
          href: `/newsletter?intent=price-alert&category=${encodeURIComponent(categorySlug)}&brand=${encodeURIComponent(brand.name)}&cadence=priority`,
          label: 'Start price watch'
        }
      ]
    : [
        {
          eyebrow: 'Recover',
          title: `Reopen the ${brand.name} hub`,
          description: `Use the broader ${brand.name} route when brand preference is still valid but this exact ${categoryLabel} lane has not filled in yet.`,
          href: `/brands/${slug}`,
          label: 'Open brand hub'
        },
        {
          eyebrow: 'Widen',
          title: `Reopen ${categoryLabel}`,
          description: `Return to the full ${categoryLabel} category when the category matters more than the brand and you need the strongest live alternatives now.`,
          href: `/categories/${categorySlug}`,
          label: 'Open category hub'
        },
        {
          eyebrow: 'Track',
          title: `Watch the ${categoryLabel} lane`,
          description: 'If the exact overlap is not ready, keep the broader category active so new coverage or price movement does not disappear from your radar.',
          href: `/newsletter?intent=category-brief&category=${encodeURIComponent(categorySlug)}&brand=${encodeURIComponent(brand.name)}&cadence=weekly`,
          label: 'Start category alerts'
        },
        {
          eyebrow: 'Search',
          title: 'Search adjacent coverage',
          description: 'Use search when your actual need may sit one level above this exact lane and you want the fastest recovery path.',
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
          `Browse ${brand.name} ${categoryLabel} coverage on Bes3 to see live products, verdicts, and next-step links inside one buyer-intent lane.`
        : `Bes3 is still building direct ${brand.name} ${categoryLabel} coverage. Use this route to recover through the closest live brand and category alternatives without restarting research.`,
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
      `How to use the ${brand.name} ${categoryLabel} lane`,
      hasDirectCoverage
        ? 'Use the lane to start with the strongest product, validate with live editorial, and widen the field only if the exact overlap stops being useful.'
        : 'Use the fallback lane to recover through the nearest live brand and category routes while direct coverage is still being built.',
      hasDirectCoverage
        ? [
            {
              name: 'Start with the exact product lane',
              text: `Open the strongest ${brand.name} ${categoryLabel} product page when you already trust the manufacturer and want the shortest route into specifics.`
            },
            {
              name: 'Validate with live editorial',
              text: 'Use the attached review, guide, or comparison once one candidate already looks plausible and you want the verdict compressed into one page.'
            },
            {
              name: 'Widen only if the lane breaks',
              text: `Return to the broader brand or category hub only when either the brand constraint or the category constraint stops helping the decision.`
            }
          ]
        : [
            {
              name: 'Recover through the brand hub',
              text: `Start with the wider ${brand.name} route when brand trust is still intact and you need the closest live coverage first.`
            },
            {
              name: 'Recover through the category hub',
              text: `Use the full ${categoryLabel} hub when the category matters more than the brand and you need active alternatives immediately.`
            },
            {
              name: 'Keep the lane alive with alerts',
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
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Brand × Category Lane</p>
              <h1 className="mt-3 font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-6xl">
                {brand.name} {toTitleCaseWords(categoryLabel)}
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-200">
                {hasDirectCoverage
                  ? hub?.description || `This lane captures buyers who already know both the brand and the category they want, then routes them into the cleanest next step without reopening broad search.`
                  : `Direct ${brand.name} ${categoryLabel} coverage is still building. This page stays alive as a recovery layer so the research path never collapses into a dead end.`}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-200/85">Products in lane</p>
                  <p className="mt-2 text-2xl font-black">{directProducts.length}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-200/85">Editorial pages</p>
                  <p className="mt-2 text-2xl font-black">{directArticles.length}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-200/85">Latest refresh</p>
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

        {(directProducts.length || fallbackProducts.length) ? (
          <section className="space-y-6">
            <div>
              <p className="editorial-kicker">{hasDirectCoverage ? 'Exact Match' : 'Closest Live Options'}</p>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl font-black tracking-tight text-foreground">
                {hasDirectCoverage ? `Start with the strongest ${brand.name} ${categoryLabel} picks.` : `Use adjacent products while ${brand.name} ${categoryLabel} coverage grows.`}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                {hasDirectCoverage
                  ? 'These products already sit inside the exact long-tail lane. Start here when you want the shortest path from intent to a product-level decision.'
                  : 'These fallback options keep the lane useful even before the exact overlap is fully populated. They preserve either the brand signal or the category signal instead of sending buyers back to broad search.'}
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
            <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">Other active lanes for {brand.name}.</h2>
            <div className="mt-6 space-y-3">
              {sameBrandLanes.map((lane) => (
                <Link
                  key={lane.category}
                  href={`/brands/${brand.slug}/categories/${lane.category}`}
                  className="block rounded-[1.5rem] bg-muted px-5 py-4 transition-colors hover:bg-emerald-50"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Brand Lane</p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">{brand.name} {toTitleCaseWords(getCategoryLabel(lane.category))}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {lane.productCount} live product {lane.productCount === 1 ? 'page' : 'pages'} and {lane.articleCount} editorial {lane.articleCount === 1 ? 'route' : 'routes'} already support this adjacent lane.
                  </p>
                </Link>
              ))}
              {!sameBrandLanes.length ? (
                <p className="text-sm leading-7 text-muted-foreground">
                  {brand.name} is still concentrated in this one lane. Reopen the full brand hub if you need the broader view before coverage expands.
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
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Category Lane</p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">{lane.brandName} {toTitleCaseWords(categoryLabel)}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {lane.productCount} live product {lane.productCount === 1 ? 'page' : 'pages'} and {lane.articleCount} editorial {lane.articleCount === 1 ? 'route' : 'routes'} give this category a live alternative if you widen beyond {brand.name}.
                  </p>
                </Link>
              ))}
              {!sameCategoryLanes.length ? (
                <p className="text-sm leading-7 text-muted-foreground">
                  No other brand-category lane is live here yet. Use the broader category hub to keep the buying lane open while Bes3 adds more direct overlap pages.
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
                {hasDirectCoverage ? 'Editorial already published for this exact lane.' : 'Editorial routes that keep this buyer intent alive.'}
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              {hasDirectCoverage
                ? 'These pages reinforce the exact brand-and-category query instead of forcing buyers back into generic archive navigation.'
                : 'Even when the exact overlap is not ready, Bes3 can still recover intent with the nearest live verdicts instead of dropping the user into an empty page.'}
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
                Editorial support for this lane is still being assembled. Use the route cards above to recover through the broader brand or category hubs instead of restarting the search.
              </p>
            ) : null}
          </div>
        </section>

        <SeoFaqSection
          title={`${brand.name} ${toTitleCaseWords(categoryLabel)} questions, answered fast.`}
          entries={faqEntries}
          description="This lane now turns exact brand-and-category intent into a structured, machine-readable route instead of leaving it split across separate hubs."
        />
      </div>
    </PublicShell>
  )
}
