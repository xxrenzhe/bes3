import { permanentRedirect } from 'next/navigation'

export default async function OfferCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  permanentRedirect(`/categories/${category}`)
}
