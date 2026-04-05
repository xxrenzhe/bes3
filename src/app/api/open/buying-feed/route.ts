import { NextResponse } from 'next/server'
import { listPublishedArticles, listPublishedProducts } from '@/lib/site-data'
import { toAbsoluteUrl } from '@/lib/site-url'

export async function GET() {
  const [products, articles] = await Promise.all([listPublishedProducts(), listPublishedArticles()])

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    products: products.slice(0, 24).map((product) => ({
      id: product.id,
      slug: product.slug,
      brand: product.brand,
      productName: product.productName,
      category: product.category,
      priceAmount: product.priceAmount,
      priceCurrency: product.priceCurrency,
      rating: product.rating,
      reviewCount: product.reviewCount,
      heroImageUrl: product.heroImageUrl,
      path: product.slug ? `/products/${product.slug}` : null,
      absoluteUrl: product.slug ? toAbsoluteUrl(`/products/${product.slug}`) : null,
      updatedAt: product.updatedAt,
      publishedAt: product.publishedAt
    })),
    articles: articles.slice(0, 24).map((article) => ({
      id: article.id,
      type: article.type,
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      productName: article.product?.productName || null,
      category: article.product?.category || null,
      heroImageUrl: article.heroImageUrl || article.product?.heroImageUrl || null,
      path:
        article.type === 'review'
          ? `/reviews/${article.slug}`
          : article.type === 'comparison'
            ? `/compare/${article.slug}`
            : `/guides/${article.slug}`,
      updatedAt: article.updatedAt,
      publishedAt: article.publishedAt
    }))
  })
}
