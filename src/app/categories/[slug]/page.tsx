import Link from 'next/link'
import { ArticleCard } from '@/components/site/ArticleCard'
import { PublicShell } from '@/components/layout/PublicShell'
import { SectionHeader } from '@/components/site/SectionHeader'
import { listPublishedArticles } from '@/lib/site-data'

export default async function CategoryPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const slug = (await params).slug
  const articles = (await listPublishedArticles()).filter((article) => article.product?.category === slug)

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-14 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <Link href="/" className="text-sm text-muted-foreground">Home / Categories / {slug}</Link>
          <SectionHeader
            eyebrow="Category Hub"
            title={slug.replace(/-/g, ' ')}
            description="A browseable archive of comparison pages, review landers, and supporting informational content."
          />
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          {articles.map((article) => {
            const href = article.type === 'comparison' ? `/compare/${article.slug}` : `/reviews/${article.slug}`
            return <ArticleCard key={article.id} article={article} href={href} />
          })}
        </div>
      </div>
    </PublicShell>
  )
}
