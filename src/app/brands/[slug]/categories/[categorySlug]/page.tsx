import { permanentRedirect } from 'next/navigation'

export default async function BrandCategoryPage({ params }: { params: Promise<{ categorySlug: string }> }) {
  const { categorySlug } = await params
  permanentRedirect(`/categories/${categorySlug}`)
}
