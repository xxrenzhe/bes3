import { permanentRedirect } from 'next/navigation'
import { getCategorySlug } from '@/lib/category'

export default async function DealsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) params.append(key, item)
      }
      continue
    }

    if (value) params.set(key, value)
  }

  const rawCategory = params.get('category')
  const categorySlug = getCategorySlug(rawCategory)

  if (categorySlug) {
    params.delete('category')
    permanentRedirect(`/offers/${categorySlug}${params.size ? `?${params.toString()}` : ''}`)
  }

  permanentRedirect(`/offers${params.size ? `?${params.toString()}` : ''}`)
}
