import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { StructuredData } from '@/components/site/StructuredData'
import { buildCategoryPath } from '@/lib/category'
import { buildPageMetadata } from '@/lib/metadata'
import { getRequestLocale } from '@/lib/request-locale'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFaqSchema, buildHowToSchema } from '@/lib/structured-data'
import { listPublishedProducts } from '@/lib/site-data'
import { formatPriceSnapshot } from '@/lib/utils'

export async function generateMetadata(): Promise<Metadata> {
  const products = await listPublishedProducts()
  const freshnessDate = products[0]?.updatedAt || products[0]?.publishedAt || null

  return buildPageMetadata({
    title: 'Products',
    description: 'Browse Bes3 product pages directly when you already know the model or want to jump straight into price and category details.',
    path: '/products',
    locale: getRequestLocale(),
    image: products[0]?.heroImageUrl,
    freshnessDate,
    freshnessInTitle: true,
    keywords: ['products', 'product pages', 'product directory', 'live price context']
  })
}

export default async function ProductsIndexPage() {
  const products = await listPublishedProducts()
  const latestRefresh = products[0]?.updatedAt || products[0]?.publishedAt || null
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' }
  ]

  const faqEntries = [
    {
      question: 'When should I use the products page?',
      answer: 'Use it when you already know the model or want to jump straight into product pages without opening a broader category page first.'
    },
    {
      question: 'What should a product page help me do?',
      answer: 'It should confirm fit, surface price and evidence, and point you to the next action like comparison, alerts, or merchant checking.'
    }
  ]

  return (
    <PublicShell>
      <StructuredData
        data={[
          buildBreadcrumbSchema('/products', breadcrumbItems),
          buildCollectionPageSchema({
            path: '/products',
            title: 'Products',
            description: 'Browse Bes3 product pages directly when you already know the model or want to jump straight into price and category details.',
            breadcrumbItems,
            dateModified: latestRefresh,
            items: products.map((product) => ({
              name: product.productName,
              path: `/products/${product.slug}`
            }))
          }),
          buildHowToSchema(
            '/products',
            'How to use Bes3 products',
            'Use the products page when the product itself is already known and you want to check it quickly.',
            [
              { name: 'Open the exact product page', text: 'Start with the model that already looks likely so you do not widen the research unnecessarily.' },
              { name: 'Check fit and details', text: 'Use the product page for price, specs, warranty details, and the best next step.' }
            ]
          ),
          buildFaqSchema('/products', faqEntries)
        ]}
      />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#0f766e_100%)] p-8 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.8)] sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">Products</p>
          <h1 className="mt-3 font-[var(--font-display)] text-5xl font-black tracking-tight sm:text-6xl">Browse every Bes3 product page.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-200">
            This page is for buyers who already know the model and want the shortest path into fit, price, and next steps.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <Link key={product.id} href={`/products/${product.slug}`} className="rounded-[2rem] bg-white p-7 shadow-panel transition-transform hover:-translate-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Product Page</p>
              <h2 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-tight text-foreground">{product.productName}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{product.description || 'Use the product page to validate fit, pricing, and next-step actions.'}</p>
              <div className="mt-5 flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-foreground">{formatPriceSnapshot(product.priceAmount, product.priceCurrency || 'USD')}</span>
                <span className="text-muted-foreground">{product.category ? `in ${product.category.replace(/-/g, ' ')}` : 'Category pending'}</span>
              </div>
              {product.category ? (
                <p className="mt-4 text-sm font-semibold text-primary">Category page: {buildCategoryPath(product.category)} →</p>
              ) : (
                <p className="mt-4 text-sm font-semibold text-primary">Open product page →</p>
              )}
            </Link>
          ))}
        </section>
      </div>
    </PublicShell>
  )
}
